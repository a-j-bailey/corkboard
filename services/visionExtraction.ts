import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { File } from 'expo-file-system';
import { z } from 'zod';
import { Event } from '../contexts/EventContext';

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
          twitter: z.string().optional(),
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
    console.error('[VisionExtraction] Error converting image to base64:', error);
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
  console.log('[VisionExtraction] ========================================');
  console.log('[VisionExtraction] Starting vision-based event extraction');
  console.log('[VisionExtraction] Image URI:', imageUri);
  console.log('[VisionExtraction] API Key provided:', apiKey ? `Yes (length: ${apiKey.length})` : 'No');

  // Check if API key is available
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('[VisionExtraction] No API key provided');
    throw new Error('xAI API key is required for vision-based extraction. Please set the API key in your environment.');
  }

  try {
    // Convert image to base64
    console.log('[VisionExtraction] Step 1: Converting image to base64...');
    let base64Image: string;
    try {
      base64Image = await convertImageToBase64(imageUri);
      console.log('[VisionExtraction] Image converted successfully');
      console.log('[VisionExtraction] Base64 size:', base64Image.length, 'characters');
      console.log('[VisionExtraction] Base64 preview:', base64Image.substring(0, 50) + '...');
    } catch (convertError) {
      console.error('[VisionExtraction] Failed to convert image to base64');
      console.error('[VisionExtraction] Conversion error:', convertError);
      if (convertError instanceof Error) {
        console.error('[VisionExtraction] Error message:', convertError.message);
        console.error('[VisionExtraction] Error stack:', convertError.stack);
      }
      throw new Error(`Failed to convert image to base64: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
    }

    // Configure xAI Grok model
    console.log('[VisionExtraction] Step 2: Configuring xAI Grok client...');
    console.log('[VisionExtraction] Base URL: https://api.x.ai/v1');
    console.log('[VisionExtraction] Model: grok-4-1-fast-non-reasoning');
    
    let xaiClient;
    let model;
    try {
      xaiClient = createOpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      console.log('[VisionExtraction] xAI client created successfully');
      
      model = xaiClient('grok-4-1-fast-non-reasoning');
      console.log('[VisionExtraction] Model configured successfully');
    } catch (clientError) {
      console.error('[VisionExtraction] Failed to create xAI client or model');
      console.error('[VisionExtraction] Client error:', clientError);
      if (clientError instanceof Error) {
        console.error('[VisionExtraction] Error message:', clientError.message);
        console.error('[VisionExtraction] Error stack:', clientError.stack);
      }
      throw new Error(`Failed to configure xAI client: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
    }

    // Use vision model to extract event details directly from image
    console.log('[VisionExtraction] Step 3: Calling xAI Grok vision API...');
    console.log('[VisionExtraction] Request details:');
    console.log('[VisionExtraction]   - Model: grok-4-1-fast-non-reasoning');
    console.log('[VisionExtraction]   - Image size:', base64Image.length, 'characters');
    console.log('[VisionExtraction]   - Schema: eventSchema with', Object.keys(eventSchema.shape.events.element.shape), 'fields');
    
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
- Date and time
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
      console.log('[VisionExtraction] API call completed successfully');
      console.log('[VisionExtraction] Response received:', result ? 'Yes' : 'No');
    } catch (apiError) {
      console.error('[VisionExtraction] ========== API ERROR ==========');
      console.error('[VisionExtraction] Failed to call xAI Grok API');
      
      // Log all properties of the error object
      const errorAny = apiError as any;
      console.error('[VisionExtraction] Error type:', errorAny?.constructor?.name || typeof apiError);
      console.error('[VisionExtraction] Error object keys:', Object.keys(errorAny));
      console.error('[VisionExtraction] Error object:', errorAny);
      
      if (apiError instanceof Error) {
        console.error('[VisionExtraction] Error message:', apiError.message || '(empty)');
        console.error('[VisionExtraction] Error name:', apiError.name);
        console.error('[VisionExtraction] Error stack:', apiError.stack || '(no stack)');
        
        // Check for AI SDK APICallError specific properties
        if ('statusCode' in errorAny) {
          console.error('[VisionExtraction] Status code:', errorAny.statusCode);
        }
        if ('status' in errorAny) {
          console.error('[VisionExtraction] HTTP status:', errorAny.status);
        }
        if ('statusText' in errorAny) {
          console.error('[VisionExtraction] HTTP status text:', errorAny.statusText);
        }
        if ('response' in errorAny) {
          console.error('[VisionExtraction] HTTP response:', errorAny.response);
          try {
            console.error('[VisionExtraction] HTTP response (JSON):', JSON.stringify(errorAny.response, null, 2));
          } catch (e) {
            console.error('[VisionExtraction] Could not stringify response');
          }
        }
        if ('responseBody' in errorAny) {
          console.error('[VisionExtraction] Response body:', errorAny.responseBody);
          console.error('[VisionExtraction] Response body type:', typeof errorAny.responseBody);
          
          // Try to parse response body if it's a string
          let parsedResponseBody = errorAny.responseBody;
          if (typeof errorAny.responseBody === 'string') {
            try {
              parsedResponseBody = JSON.parse(errorAny.responseBody);
              console.error('[VisionExtraction] Parsed response body:', parsedResponseBody);
            } catch (parseError) {
              console.error('[VisionExtraction] Could not parse response body as JSON');
            }
          }
          
          try {
            console.error('[VisionExtraction] Response body (JSON):', JSON.stringify(parsedResponseBody, null, 2));
          } catch (e) {
            console.error('[VisionExtraction] Could not stringify response body');
          }
        }
        if ('request' in errorAny) {
          console.error('[VisionExtraction] Request:', errorAny.request);
        }
        if ('requestBody' in errorAny) {
          console.error('[VisionExtraction] Request body:', errorAny.requestBody);
          try {
            console.error('[VisionExtraction] Request body (JSON):', JSON.stringify(errorAny.requestBody, null, 2));
          } catch (e) {
            console.error('[VisionExtraction] Could not stringify request body');
          }
        }
        if ('cause' in errorAny && errorAny.cause) {
          console.error('[VisionExtraction] Error cause:', errorAny.cause);
          if (errorAny.cause instanceof Error) {
            console.error('[VisionExtraction] Cause message:', errorAny.cause.message);
            console.error('[VisionExtraction] Cause stack:', errorAny.cause.stack);
          }
        }
        if ('data' in errorAny) {
          console.error('[VisionExtraction] Error data:', errorAny.data);
          try {
            console.error('[VisionExtraction] Error data (JSON):', JSON.stringify(errorAny.data, null, 2));
          } catch (e) {
            console.error('[VisionExtraction] Could not stringify error data');
          }
        }
        if ('error' in errorAny) {
          console.error('[VisionExtraction] Nested error:', errorAny.error);
        }
      }
      
      // Try to extract more details from the error using all property names
      try {
        const allProps = Object.getOwnPropertyNames(apiError);
        const protoProps = Object.getOwnPropertyNames(Object.getPrototypeOf(apiError));
        console.error('[VisionExtraction] Own properties:', allProps);
        console.error('[VisionExtraction] Prototype properties:', protoProps);
        
        // Try to get values of all properties
        const errorDetails: Record<string, any> = {};
        [...allProps, ...protoProps].forEach(prop => {
          try {
            const value = (apiError as any)[prop];
            if (typeof value !== 'function') {
              errorDetails[prop] = value;
            }
          } catch (e) {
            // Skip properties that can't be accessed
          }
        });
        console.error('[VisionExtraction] All error properties:', JSON.stringify(errorDetails, null, 2));
      } catch (extractError) {
        console.error('[VisionExtraction] Could not extract all properties:', extractError);
      }
      
      // Build a more descriptive error message
      let errorMessage = 'xAI API call failed';
      if (errorAny.statusCode) {
        errorMessage += ` (Status: ${errorAny.statusCode})`;
      } else if (errorAny.status) {
        errorMessage += ` (Status: ${errorAny.status})`;
      }
      
      // Try to extract error message from response body
      let responseBodyError = null;
      if (errorAny.responseBody) {
        // Parse if it's a string
        if (typeof errorAny.responseBody === 'string') {
          try {
            const parsed = JSON.parse(errorAny.responseBody);
            responseBodyError = parsed.error || parsed.message || parsed.code;
          } catch (e) {
            // Not JSON, use as-is
            responseBodyError = errorAny.responseBody;
          }
        } else {
          responseBodyError = errorAny.responseBody.error || errorAny.responseBody.message || errorAny.responseBody.code;
        }
      }
      
      if (responseBodyError) {
        errorMessage += `: ${responseBodyError}`;
      } else if (errorAny.response?.error?.message) {
        errorMessage += `: ${errorAny.response.error.message}`;
      } else if (apiError instanceof Error && apiError.message) {
        errorMessage += `: ${apiError.message}`;
      } else if (errorAny.message) {
        errorMessage += `: ${errorAny.message}`;
      }
      
      console.error('[VisionExtraction] ================================');
      throw new Error(errorMessage);
    }

    console.log('[VisionExtraction] Step 4: Processing API response...');
    const extractedData = result.object as unknown as ExtractedEvents;
    console.log('[VisionExtraction] Response object received:', extractedData ? 'Yes' : 'No');

    if (extractedData.events && extractedData.events.length > 0) {
      console.log('[VisionExtraction] Found', extractedData.events.length, 'event(s) in response');
      console.log('[VisionExtraction] Processing first event...');
      // Use the first event (or we could show a picker if multiple)
      const firstEvent = extractedData.events[0];
      console.log('[VisionExtraction] First event data:', JSON.stringify(firstEvent, null, 2));

      // Convert social media handles to the format expected by Event type
      const socialMediaHandles = firstEvent.socialMediaHandles
        ? {
            ...(firstEvent.socialMediaHandles.twitter && {
              twitter: firstEvent.socialMediaHandles.twitter,
            }),
            ...(firstEvent.socialMediaHandles.instagram && {
              instagram: firstEvent.socialMediaHandles.instagram,
            }),
            ...(firstEvent.socialMediaHandles.facebook && {
              facebook: firstEvent.socialMediaHandles.facebook,
            }),
          }
        : undefined;

      const parsedEvent: Partial<Event> = {
        title: firstEvent.title,
        date: firstEvent.date,
        time: firstEvent.time,
        address: firstEvent.address,
        cost: firstEvent.cost,
        websiteUrl: firstEvent.websiteUrl,
        socialMediaHandles: socialMediaHandles,
        description: firstEvent.description,
        organizationName: firstEvent.organizationName,
      };

      console.log('[VisionExtraction] Step 5: Event data formatted successfully');
      console.log('[VisionExtraction] Final extracted event data:', JSON.stringify(parsedEvent, null, 2));
      console.log('[VisionExtraction] ========================================');
      return parsedEvent;
    }

    console.warn('[VisionExtraction] No events found in vision API response');
    console.warn('[VisionExtraction] Response data:', JSON.stringify(extractedData, null, 2));
    console.error('[VisionExtraction] ========================================');
    throw new Error('No events found in the image');
  } catch (error) {
    console.error('[VisionExtraction] ========== EXTRACTION ERROR ==========');
    console.error('[VisionExtraction] Error during vision extraction');
    console.error('[VisionExtraction] Error type:', error?.constructor?.name || typeof error);
    console.error('[VisionExtraction] Error:', error);
    
    if (error instanceof Error) {
      console.error('[VisionExtraction] Error message:', error.message);
      console.error('[VisionExtraction] Error stack:', error.stack);
      console.error('[VisionExtraction] ========================================');
      throw new Error(`Vision extraction failed: ${error.message}`);
    }
    
    console.error('[VisionExtraction] ========================================');
    throw new Error('Vision extraction failed: Unknown error');
  }
}

