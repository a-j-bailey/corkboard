import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Image } from 'react-native';
import { z } from 'zod';
import { Event, EventDate } from '../contexts/EventContext';
import { parseDates, parseEventDetails, parsePriceToNumber } from './eventParser';
import { extractTextFromImage } from './textExtraction';

/** Set `EXPO_PUBLIC_OCR_FIRST_EXTRACTION=1` to run local OCR + text parsing before the vision model (may skip vision when title+dates are found). Default is vision-only. */
const useOcrFirstExtraction = process.env.EXPO_PUBLIC_OCR_FIRST_EXTRACTION === '1';

/** Typical JSON output is a few hundred tokens; cap reduces decode latency vs a very high max. */
const VISION_EXTRACTION_MAX_OUTPUT_TOKENS = 768;

/** Longest edge for vision API — posters stay readable; smaller payloads = less upload + vision latency. */
const VISION_MAX_IMAGE_DIMENSION = 1280;

const VISION_JPEG_QUALITY = 0.82;

/** Lenient: models often return domains or paths without a scheme; we normalize when mapping to Event. */
const optionalWebsiteString = z
  .string()
  .max(2048)
  .optional()
  .describe('URL or domain/path as printed (https:// preferred; bare domains allowed).');

const optionalHandle = z
  .string()
  .max(120)
  .optional()
  .describe('Exact text from the poster; @ prefix optional.');

// Zod schema for event extraction — descriptions steer the model; constraints catch obvious junk.
const eventSchema = z.object({
  event: z
    .object({
      title: z
        .string()
        .max(300)
        .optional()
        .describe(
          'Largest or most prominent headline for ONE event. Omit if unreadable. Ignore sponsor logos unless clearly the main title.'
        ),
      date: z
        .string()
        .max(200)
        .optional()
        .describe(
          'When the headline event occurs. Prefer YYYY-MM-DD. For multi-day spans use "YYYY-MM-DD to YYYY-MM-DD". If no date appears, omit this field—do not guess a year.'
        ),
      time: z
        .string()
        .max(120)
        .optional()
        .describe(
          'Start time and optional end (e.g. "7:00 PM" or "7pm - 10pm"). Omit if not on the poster.'
        ),
      address: z
        .string()
        .max(500)
        .optional()
        .describe('Venue street address or "Venue name, City" as printed. Omit if not visible; do not invent.'),
      cost: z
        .string()
        .max(120)
        .optional()
        .describe('Price or admission exactly as written (e.g. "$15", "Free", "Donation"). Omit if unknown.'),
      websiteUrl: optionalWebsiteString,
      socialMediaHandles: z
        .object({
          x: optionalHandle,
          instagram: optionalHandle,
          facebook: optionalHandle,
        })
        .optional()
        .describe('Copy handles or page names exactly; omit any platform not shown on the image.'),
      description: z
        .string()
        .max(4000)
        .optional()
        .describe(
          'Supporting text: tagline, performers, fine print that clarifies the main event. Omit boilerplate and duplicate title.'
        ),
      organizationName: z
        .string()
        .max(200)
        .optional()
        .describe('Host, presenter, or organizer name as labeled (not the same as venue unless clearly one entity).'),
    })
    .optional()
    .describe(
      'The single most prominent event on this image. Omit entire object only if there is no real event (e.g. blank, pure photo, or unreadable).'
    ),
});

const VISION_EXTRACTION_USER_PROMPT = `You are extracting structured data for a community events app from ONE poster, flyer, or screenshot of an event graphic.

## What to extract
Identify the single PRIMARY event—the one the design is mainly advertising (usually the largest title and central message). Ignore background sponsors, ticket sellers, and small-print legal unless needed for time/price/location.

## Rules
1. **Read visually**: Use layout, font size, and hierarchy. Small or stylized text still matters for time, address, and URLs—read it carefully.
2. **Transcribe literally**: Copy prices, URLs, handles, and venue names exactly as printed. Normalize dates to ISO when the calendar day is clear; otherwise transcribe the phrase (e.g. "Every Friday in March").
3. **Do not invent**: If a field is missing, unclear, or cropped out, omit that field. Never fabricate dates, places, or links.
4. **One event only**: If several events are listed, pick the dominant one. Do not merge unrelated events into one title.
5. **Date & time**: Prefer YYYY-MM-DD for a single day; use "YYYY-MM-DD to YYYY-MM-DD" for a clear consecutive range. Put door/show times in "time" when shown.
6. **URLs & social**: websiteUrl may be a full URL or a domain/path as printed (e.g. example.org/events). For social fields, use visible @handles or account names only.

## Output
Fill the schema fields accordingly. Prefer leaving fields empty over guessing.`;

type ExtractedEventData = z.infer<typeof eventSchema>;

const MAX_LOG_MODEL_TEXT = 16000;
const MAX_LOG_HTTP_BODY = 8000;

/**
 * Logs generateObject / provider failures in detail for debugging (schema mismatch, raw model output, HTTP, Zod issues).
 */
function logVisionGenerateObjectFailure(apiError: unknown): void {
  console.error('[VisionExtraction] generateObject failed — structured debug log');

  if (apiError instanceof Error) {
    console.error('[VisionExtraction] generateObject failed — name:', apiError.name);
    console.error('[VisionExtraction] generateObject failed — message:', apiError.message);
    if (apiError.stack) {
      console.error('[VisionExtraction] generateObject failed — stack:', apiError.stack);
    }
  } else {
    console.error('[VisionExtraction] generateObject failed — value:', apiError);
  }

  const e = apiError as Record<string, unknown>;

  const rawText = e.text;
  if (typeof rawText === 'string') {
    console.error(
      `[VisionExtraction] generateObject failed — raw model text (length=${rawText.length}):`,
      rawText.length > MAX_LOG_MODEL_TEXT
        ? `${rawText.slice(0, MAX_LOG_MODEL_TEXT)}…`
        : rawText
    );
  }

  const cause = e.cause;
  if (cause != null) {
    console.error('[VisionExtraction] generateObject failed — error.cause:', cause);
    if (
      typeof cause === 'object' &&
      cause !== null &&
      'issues' in cause &&
      Array.isArray((cause as { issues: unknown }).issues)
    ) {
      console.error(
        '[VisionExtraction] generateObject failed — Zod / validation issues:',
        JSON.stringify((cause as { issues: unknown[] }).issues, null, 2)
      );
    }
  }

  const status = e.statusCode ?? e.status;
  if (status != null) {
    console.error('[VisionExtraction] generateObject failed — HTTP status:', status);
  }

  if (e.responseBody != null) {
    const rb = e.responseBody;
    const str = typeof rb === 'string' ? rb : JSON.stringify(rb);
    console.error(
      '[VisionExtraction] generateObject failed — responseBody:',
      str.length > MAX_LOG_HTTP_BODY ? `${str.slice(0, MAX_LOG_HTTP_BODY)}…(truncated)` : str
    );
  }

  if (e.response != null) {
    try {
      console.error('[VisionExtraction] generateObject failed — response:', JSON.stringify(e.response, null, 2));
    } catch {
      console.error('[VisionExtraction] generateObject failed — response:', e.response);
    }
  }

  for (const key of ['data', 'value', 'finishReason', 'usage'] as const) {
    if (e[key] != null) {
      console.error(`[VisionExtraction] generateObject failed — ${key}:`, e[key]);
    }
  }

  const skip = new Set([
    'text',
    'cause',
    'responseBody',
    'response',
    'stack',
    'message',
    'name',
    'data',
    'value',
    'finishReason',
    'usage',
    'statusCode',
    'status',
  ]);
  for (const key of Object.keys(e)) {
    if (skip.has(key)) continue;
    const v = e[key];
    if (typeof v === 'function') continue;
    if (typeof v === 'string' && v.length > 4000) {
      console.error(
        `[VisionExtraction] generateObject failed — ${key} (truncated, len=${v.length}):`,
        `${v.slice(0, 4000)}…`
      );
    } else {
      console.error(`[VisionExtraction] generateObject failed — ${key}:`, v);
    }
  }
}

/**
 * Adds https:// when the model returns a host or path without a scheme so links work in the app.
 */
function normalizeWebsiteUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(t) || t.startsWith('//')) {
    return t.startsWith('//') ? `https:${t}` : `https://${t.replace(/^\/+/, '')}`;
  }
  return t;
}

function getImagePixelSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Downscales large camera images and recompresses JPEG to shrink the vision request (faster round-trip).
 * Falls back to raw base64 if manipulation fails.
 */
async function prepareImageForVisionApi(uri: string): Promise<string> {
  try {
    const { width, height } = await getImagePixelSize(uri);
    const maxDim = Math.max(width, height);
    const actions: ImageManipulator.Action[] = [];
    if (maxDim > VISION_MAX_IMAGE_DIMENSION) {
      actions.push(
        width >= height
          ? { resize: { width: VISION_MAX_IMAGE_DIMENSION } }
          : { resize: { height: VISION_MAX_IMAGE_DIMENSION } }
      );
    }
    const { uri: outUri } = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: VISION_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const file = new File(outUri);
    const base64 = await file.base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.warn('[VisionExtraction] prepareImageForVisionApi failed, using full-size image:', e);
    return convertImageToBase64(uri);
  }
}

/**
 * Converts image URI to base64 string
 */
async function convertImageToBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    throw new Error('Failed to convert image to base64');
  }
}

/**
 * Extracts event details directly from image using an xAI vision model
 * via xAI's OpenAI-compatible API. This is more accurate than OCR + parsing
 * because the model understands context.
 *
 * @param imageUri - URI of the image to process
 * @param apiKey - xAI API key
 * Opt in to OCR-first with env `EXPO_PUBLIC_OCR_FIRST_EXTRACTION=1` (default is vision-only).
 */
export async function extractEventFromImage(
  imageUri: string,
  apiKey: string
): Promise<Partial<Event>> {
  console.log('[VisionExtraction] Starting event extraction from image');

  try {
    // 1) Optional OCR-first attempt (fast, local) before calling any vision model.
    if (useOcrFirstExtraction) {
      try {
        const ocrStartMs = Date.now();
        console.log('[VisionExtraction] Attempting OCR-first extraction...');

        const extractedText = await extractTextFromImage(imageUri);
        const ocrTextMs = Date.now() - ocrStartMs;
        console.log(
          '[VisionExtraction] OCR text extracted in ms:',
          ocrTextMs,
          'length:',
          extractedText.length
        );

        const parsedFromText = await parseEventDetails(extractedText);
        const hasTitle = !!parsedFromText.title && parsedFromText.title.trim().length > 0;
        const hasDates = Array.isArray(parsedFromText.dates) && parsedFromText.dates.length > 0;
        console.log('[VisionExtraction] OCR parsed fields - title:', hasTitle, 'dates:', hasDates);

        // If we have the critical fields, skip the slow vision model entirely.
        if (hasTitle && hasDates) {
          console.log('[VisionExtraction] OCR-first succeeded; skipping vision model.');
          return parsedFromText;
        }
      } catch (ocrError) {
        console.warn(
          '[VisionExtraction] OCR-first extraction failed; falling back to vision model:',
          ocrError instanceof Error ? ocrError.message : ocrError
        );
      }
    } else {
      console.log('[VisionExtraction] OCR-first disabled; using vision model only.');
    }

    // Check if API key is available only when we need the vision model.
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'xAI API key is required for vision-based extraction. Please set the xAI API key in your environment.'
      );
    }

    // Convert image to base64
    let base64Image: string;
    const base64StartMs = Date.now();
    try {
      base64Image = await prepareImageForVisionApi(imageUri);
      console.log(
        '[VisionExtraction] Image converted to base64, size:',
        Math.round(base64Image.length / 1024),
        'KB in ms:',
        Date.now() - base64StartMs
      );
    } catch (convertError) {
      console.error('[VisionExtraction] Failed to convert image to base64:', convertError instanceof Error ? convertError.message : convertError);
      throw new Error(`Failed to convert image to base64: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
    }

    // Configure xAI vision model via OpenAI-compatible API
    let openaiClient;
    let model;
    try {
      openaiClient = createOpenAI({
        apiKey,
        baseURL: process.env.EXPO_PUBLIC_XAI_BASE_URL || 'https://api.x.ai/v1',
      });
      model = openaiClient('grok-4-1-fast-non-reasoning');
      console.log('[VisionExtraction] Calling xAI API...');
    } catch (clientError) {
      console.error(
        '[VisionExtraction] Failed to configure xAI client:',
        clientError instanceof Error ? clientError.message : clientError
      );
      throw new Error(
        `Failed to configure xAI client: ${
          clientError instanceof Error ? clientError.message : 'Unknown error'
        }`
      );
    }

    // Use vision model to extract event details directly from image
    let result;
    const visionStartMs = Date.now();
    try {
      result = await generateObject({
        model,
        providerOptions: {
          openai: {
            // Fewer vision tokens / faster than "high" or "auto" on OpenAI-compatible providers.
            imageDetail: 'low',
          },
        },
        maxRetries: 1,
        maxOutputTokens: VISION_EXTRACTION_MAX_OUTPUT_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: VISION_EXTRACTION_USER_PROMPT,
              },
              {
                type: 'image',
                image: base64Image,
              },
            ],
          },
        ],
        schema: eventSchema,
      });
      console.log('[VisionExtraction] Vision API call completed in ms:', Date.now() - visionStartMs);
    } catch (apiError) {
      logVisionGenerateObjectFailure(apiError);

      const errorAny = apiError as any;

      // Extract error details
      const statusCode = errorAny.statusCode || errorAny.status;
      let responseBodyError = null;
      
      if (errorAny.responseBody) {
        if (typeof errorAny.responseBody === 'string') {
          try {
            const parsed = JSON.parse(errorAny.responseBody);
            responseBodyError = parsed.error || parsed.message || parsed.code;
          } catch (e) {
            responseBodyError = errorAny.responseBody;
          }
        } else {
          responseBodyError = errorAny.responseBody.error || errorAny.responseBody.message || errorAny.responseBody.code;
        }
      }
      
      // Build error message
      let errorMessage = 'xAI API call failed';
      if (statusCode) {
        errorMessage += ` (Status: ${statusCode})`;
      }
      if (responseBodyError) {
        errorMessage += `: ${responseBodyError}`;
      } else if (errorAny.response?.error?.message) {
        errorMessage += `: ${errorAny.response.error.message}`;
      } else if (apiError instanceof Error && apiError.message) {
        errorMessage += `: ${apiError.message}`;
      }

      console.error('[VisionExtraction] API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const extractedData = result.object as unknown as ExtractedEventData;
    console.log('[VisionExtraction] Extracted data:', extractedData);

    if (extractedData.event) {
      // We intentionally only ask for the primary event.
      const firstEvent = extractedData.event;

      // Convert social media handles to the format expected by Event type
      const socialMediaHandles = firstEvent.socialMediaHandles
        ? {
            ...(firstEvent.socialMediaHandles.x && {
              x: firstEvent.socialMediaHandles.x,
            }),
            ...(firstEvent.socialMediaHandles.instagram && {
              instagram: firstEvent.socialMediaHandles.instagram,
            }),
            ...(firstEvent.socialMediaHandles.facebook && {
              facebook: firstEvent.socialMediaHandles.facebook,
            }),
          }
        : undefined;

      // Parse dates and price
      // Handle both string dates (like "2025-09-11 to 2025-09-14") and structured formats
      let dates: EventDate[] = [];
      if (firstEvent.date) {
        // Try parsing the date string - it might be a range like "2025-09-11 to 2025-09-14"
        dates = parseDates(firstEvent.date, firstEvent.time);
        
        // If parsing failed and we got an empty array, try fallback parsing
        if (dates.length === 0) {
          console.log('[VisionExtraction] Date parsing failed, using fallback for:', firstEvent.date);
          // Try to extract just the start date if it's a range (local midnight, then store as UTC)
          const isoDateMatch = firstEvent.date.match(/(\d{4}-\d{2}-\d{2})/);
          if (isoDateMatch) {
            const [y, m, d] = isoDateMatch[1].split('-').map(Number);
            const fallbackDate = new Date(y, m - 1, d, 0, 0, 0);
            if (!isNaN(fallbackDate.getTime())) {
              dates = [{ start: fallbackDate.toISOString() }];
            }
          }
        }
      }
      
      const price = parsePriceToNumber(firstEvent.cost);
      console.log('[VisionExtraction] Extracted fields - title:', !!firstEvent.title, 'date:', !!dates.length, 'address:', !!firstEvent.address, 'price:', price !== null);

      const parsedEvent: Partial<Event> = {
        title: firstEvent.title,
        dates: dates,
        price: price,
        address: firstEvent.address,
        websiteUrl: normalizeWebsiteUrl(firstEvent.websiteUrl),
        socialMediaHandles: socialMediaHandles,
        description: firstEvent.description,
        organizationName: firstEvent.organizationName,
      };

      console.log('[VisionExtraction] Successfully extracted event:', firstEvent.title ?? '(no title)');
      return parsedEvent;
    }

    console.warn('[VisionExtraction] No event found in API response');
    throw new Error('No primary event found in the image');
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith('Vision extraction failed:')) {
      console.error('[VisionExtraction] Error:', error.message);
      throw new Error(`Vision extraction failed: ${error.message}`);
    }
    throw error;
  }
}

