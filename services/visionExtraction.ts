import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { File } from 'expo-file-system';
import { z } from 'zod';
import { Event, EventDate } from '../contexts/EventContext';
import { parseDates, parsePriceToNumber } from './eventParser';

// Zod schema for event extraction
const eventSchema = z.object({
  events: z.array(
    z.object({
      title: z.string().describe('Event title'),
      date: z.string().describe('Event date in YYYY-MM-DD format or as written on poster'),
      time: z.string().optional().describe('Event time if available'),
      address: z.string().optional().describe('Event address or location'),
      cost: z.string().optional().describe('Event cost or price'),
      websiteUrl: z.string().optional().describe('Event website URL'),
      socialMediaHandles: z
        .object({
          x: z.string().optional(),
          instagram: z.string().optional(),
          facebook: z.string().optional(),
        })
        .optional()
        .describe('Social media handles if available'),
      description: z.string().optional().describe('Event description'),
      organizationName: z.string().optional().describe('Organization or host name'),
    })
  ),
});

type ExtractedEvents = z.infer<typeof eventSchema>;

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
 * Extracts event details directly from image using xAI Grok vision model
 * This is more accurate than OCR + parsing because the model understands context
 * 
 * @param imageUri - URI of the image to process
 * @param apiKey - xAI API key
 */
export async function extractEventFromImage(
  imageUri: string,
  apiKey: string
): Promise<Partial<Event>> {
  console.log('[VisionExtraction] Starting event extraction from image');

  // Check if API key is available
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('xAI API key is required for vision-based extraction. Please set the API key in your environment.');
  }

  try {
    // Convert image to base64
    let base64Image: string;
    try {
      base64Image = await convertImageToBase64(imageUri);
      console.log('[VisionExtraction] Image converted to base64, size:', Math.round(base64Image.length / 1024), 'KB');
    } catch (convertError) {
      console.error('[VisionExtraction] Failed to convert image to base64:', convertError instanceof Error ? convertError.message : convertError);
      throw new Error(`Failed to convert image to base64: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
    }

    // Configure xAI Grok model
    let xaiClient;
    let model;
    try {
      xaiClient = createOpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      model = xaiClient('grok-4-1-fast-non-reasoning');
      console.log('[VisionExtraction] Calling xAI API...');
    } catch (clientError) {
      console.error('[VisionExtraction] Failed to configure xAI client:', clientError instanceof Error ? clientError.message : clientError);
      throw new Error(`Failed to configure xAI client: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
    }

    // Use vision model to extract event details directly from image
    let result;
    try {
      result = await generateObject({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all event information from this poster/flyer image. Look for:
- Event title (usually the largest/most prominent text)
- Date and time (if multiple, return an array of date/times)
- Location/address
- Price/cost
- Website URL
- Social media handles (Twitter, Instagram, Facebook)
- Description
- Organization/host name

If there are multiple events on the poster, extract all of them. Return the information as structured data.`,
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
      console.log('[VisionExtraction] API call completed');
    } catch (apiError) {
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

    const extractedData = result.object as unknown as ExtractedEvents;
    console.log('[VisionExtraction] Extracted data:', extractedData);
    console.log('[VisionExtraction] Processing response, events found:', extractedData.events?.length || 0);

    if (extractedData.events && extractedData.events.length > 0) {
      // Use the first event (or we could show a picker if multiple)
      const firstEvent = extractedData.events[0];

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
        websiteUrl: firstEvent.websiteUrl,
        socialMediaHandles: socialMediaHandles,
        description: firstEvent.description,
        organizationName: firstEvent.organizationName,
      };

      console.log('[VisionExtraction] Successfully extracted event:', firstEvent.title);
      return parsedEvent;
    }

    console.warn('[VisionExtraction] No events found in API response');
    throw new Error('No events found in the image');
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith('Vision extraction failed:')) {
      console.error('[VisionExtraction] Error:', error.message);
      throw new Error(`Vision extraction failed: ${error.message}`);
    }
    throw error;
  }
}

