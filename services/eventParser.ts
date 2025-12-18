import { apple } from '@react-native-ai/apple';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Event, SocialMediaHandles } from '../contexts/EventContext';

// Zod schema for event extraction (supports multiple events)
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
 * Parses extracted text to identify event details
 * Uses Apple Intelligence if available, otherwise falls back to rule-based parsing
 */
export async function parseEventDetails(text: string): Promise<Partial<Event>> {
  console.log('[EventParser] Starting event details parsing');
  console.log('[EventParser] Input text length:', text.length, 'characters');
  
  // Validate input
  if (!text || text.trim().length === 0) {
    console.error('[EventParser] No text provided for parsing');
    throw new Error('No text provided for parsing');
  }

  // Try Apple Intelligence first if available
  if (apple.isAvailable()) {
    console.log('[EventParser] Apple Intelligence is available, attempting ML-based parsing...');
    try {
      const result = await parseWithAppleIntelligence(text);
      console.log('[EventParser] Apple Intelligence parsing successful');
      console.log('[EventParser] Extracted event data:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.warn('[EventParser] Apple Intelligence parsing failed, falling back to rule-based:', error);
      // Fall through to rule-based parsing
    }
  } else {
    console.log('[EventParser] Apple Intelligence not available, using rule-based parsing');
  }

  // Fallback to rule-based parsing
  console.log('[EventParser] Using rule-based parsing...');
  try {
    const result = parseWithRules(text);
    console.log('[EventParser] Rule-based parsing completed');
    console.log('[EventParser] Extracted event data:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[EventParser] Rule-based parsing failed:', error);
    // Return empty object so user can still manually enter data
    return {};
  }
}

/**
 * Uses Apple Intelligence to parse event details from text
 */
async function parseWithAppleIntelligence(text: string): Promise<Partial<Event>> {
  console.log('[EventParser] Calling Apple Intelligence API...');
  
  const result = await generateObject({
    model: apple(),
    messages: [
      {
        role: 'user',
        content: `Extract all event information from this text. If there are multiple events, extract all of them. Return as structured data.

Text:
${text}`,
      },
    ],
    schema: eventSchema,
  });

  console.log('[EventParser] Apple Intelligence API response received');
  const extractedData = result.object as unknown as ExtractedEvents;

  if (extractedData.events && extractedData.events.length > 0) {
    console.log('[EventParser] Found', extractedData.events.length, 'event(s) in response');
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

    const parsedEvent = {
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
    
    console.log('[EventParser] Parsed event from Apple Intelligence:', parsedEvent);
    return parsedEvent;
  }

  console.warn('[EventParser] No events found in Apple Intelligence response');
  throw new Error('No events found in extracted data');
}

/**
 * Rule-based parsing using regex patterns and heuristics
 */
function parseWithRules(text: string): Partial<Event> {
  console.log('[EventParser] Starting rule-based parsing');
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('[EventParser] Text split into', lines.length, 'lines');
  
  const title = extractTitle(lines);
  const date = extractDate(text);
  const time = extractTime(text);
  const address = extractLocation(text, lines);
  const cost = extractPrice(text);
  const websiteUrl = extractUrls(text)[0];
  const socialMediaHandles = extractSocialHandles(text);
  const description = extractDescription(text, lines);
  const organizationName = extractOrganizationName(text, lines);
  
  console.log('[EventParser] Rule-based extraction results:');
  console.log('  - Title:', title || '(not found)');
  console.log('  - Date:', date || '(not found)');
  console.log('  - Time:', time || '(not found)');
  console.log('  - Address:', address || '(not found)');
  console.log('  - Cost:', cost || '(not found)');
  console.log('  - Website URL:', websiteUrl || '(not found)');
  console.log('  - Social Media:', socialMediaHandles ? JSON.stringify(socialMediaHandles) : '(not found)');
  console.log('  - Description:', description ? `${description.substring(0, 50)}...` : '(not found)');
  console.log('  - Organization:', organizationName || '(not found)');
  
  return {
    title,
    date,
    time,
    address,
    cost,
    websiteUrl,
    socialMediaHandles,
    description,
    organizationName,
  };
}

/**
 * Extracts event title - typically the largest/first prominent text
 */
function extractTitle(lines: string[]): string | undefined {
  if (lines.length === 0) return undefined;
  
  // Title is usually one of the first few lines, and often the longest or most prominent
  // Look for lines that are likely titles (not dates, times, or addresses)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip if it looks like a date, time, or address
    if (
      !isDateLike(line) &&
      !isTimeLike(line) &&
      !isAddressLike(line) &&
      line.length > 3 &&
      line.length < 100
    ) {
      return line;
    }
  }
  
  // Fallback to first non-empty line
  return lines[0];
}

/**
 * Extracts date from text
 */
function extractDate(text: string): string | undefined {
  // Common date patterns
  const datePatterns = [
    // YYYY-MM-DD
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
    // MM/DD/YYYY or MM-DD-YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
    // Month DD, YYYY
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // Mon DD, YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // DD Month YYYY
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to normalize to YYYY-MM-DD format
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        // Return as-is if parsing fails
        return match[0];
      }
    }
  }

  return undefined;
}

/**
 * Extracts time from text
 */
function extractTime(text: string): string | undefined {
  // Time patterns: HH:MM, H:MM AM/PM, etc.
  const timePatterns = [
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b/i,
    /\b(\d{1,2}):(\d{2})\b/,
    /\b(\d{1,2})\s*(AM|PM|am|pm)\b/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Extracts location/address from text
 */
function extractLocation(text: string, lines: string[]): string | undefined {
  // Address keywords
  const addressKeywords = [
    'street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd',
    'drive', 'dr', 'lane', 'ln', 'way', 'park', 'plaza', 'center', 'centre',
    'venue', 'location', 'address', 'at', '@'
  ];

  // Look for lines containing address keywords
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (addressKeywords.some(keyword => lowerLine.includes(keyword))) {
      return line;
    }
  }

  // Look for patterns like "123 Main St" or "123 Main Street"
  const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Park|Plaza|Center|Centre)\b/i;
  const match = text.match(addressPattern);
  if (match) {
    return match[0];
  }

  return undefined;
}

/**
 * Extracts price/cost from text
 */
function extractPrice(text: string): string | undefined {
  // Price patterns: $XX, $XX.XX, Free, etc.
  const pricePatterns = [
    /\$\s*(\d+(?:\.\d{2})?)\b/,
    /\b(\d+(?:\.\d{2})?)\s*dollars?\b/i,
    /\bfree\b/i,
    /\bno\s+charge\b/i,
    /\bcomplimentary\b/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Extracts URLs from text
 */
function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlPattern);
  return matches || [];
}

/**
 * Extracts social media handles from text
 */
function extractSocialHandles(text: string): SocialMediaHandles | undefined {
  const handles: SocialMediaHandles = {};

  // X handles: @username
  const xPattern = /@(\w+)/gi;
  const xMatches = text.match(xPattern);
  if (xMatches && xMatches.length > 0) {
    // Take the first @ mention as X
    handles.x = xMatches[0];
  }

  // Instagram: @username (often mentioned as "IG: @username" or "Instagram: @username")
  const instagramPattern = /(?:instagram|ig)[:\s]*@(\w+)/gi;
  const instagramMatch = text.match(instagramPattern);
  if (instagramMatch) {
    const handleMatch = instagramMatch[0].match(/@(\w+)/);
    if (handleMatch) {
      handles.instagram = `@${handleMatch[1]}`;
    }
  }

  // Facebook: often mentioned as "Facebook: page-name" or "FB: page-name"
  const facebookPattern = /(?:facebook|fb)[:\s]+([^\s,]+)/gi;
  const facebookMatch = text.match(facebookPattern);
  if (facebookMatch) {
    handles.facebook = facebookMatch[0].replace(/(?:facebook|fb)[:\s]+/i, '').trim();
  }

  return Object.keys(handles).length > 0 ? handles : undefined;
}

/**
 * Extracts description - typically longer text blocks
 */
function extractDescription(text: string, lines: string[]): string | undefined {
  // Description is usually longer text, not structured data
  // Look for paragraphs (multiple lines together)
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    // Skip if it looks like structured data
    if (
      isDateLike(line) ||
      isTimeLike(line) ||
      isAddressLike(line) ||
      line.match(/^\$/) || // Price
      line.match(/^@/) || // Social handle
      line.match(/^https?:\/\//) // URL
    ) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      continue;
    }

    // If line is reasonably long, it might be part of description
    if (line.length > 20) {
      currentParagraph.push(line);
    } else if (currentParagraph.length > 0) {
      // Short line might be a break, but continue if we have content
      currentParagraph.push(line);
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }

  // Return the longest paragraph as description
  if (paragraphs.length > 0) {
    return paragraphs.sort((a, b) => b.length - a.length)[0];
  }

  return undefined;
}

/**
 * Extracts organization name
 */
function extractOrganizationName(text: string, lines: string[]): string | undefined {
  // Look for common organization indicators
  const orgKeywords = ['presents', 'proudly presents', 'hosted by', 'organized by', 'by'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const keyword of orgKeywords) {
      if (line.includes(keyword)) {
        // Organization name might be on the same line or next line
        const parts = lines[i].split(new RegExp(keyword, 'i'));
        if (parts.length > 1 && parts[1].trim()) {
          return parts[1].trim();
        }
        if (i + 1 < lines.length) {
          return lines[i + 1];
        }
      }
    }
  }

  return undefined;
}

// Helper functions
function isDateLike(text: string): boolean {
  return /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text) ||
         /\b(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(text);
}

function isTimeLike(text: string): boolean {
  return /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b/i.test(text);
}

function isAddressLike(text: string): boolean {
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'drive', 'dr'];
  const lowerText = text.toLowerCase();
  return addressKeywords.some(keyword => lowerText.includes(keyword)) ||
         /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd)\b/i.test(text);
}

