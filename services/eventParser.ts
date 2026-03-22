import { apple } from '@react-native-ai/apple';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Event, EventDate, SocialMediaHandles } from '../contexts/EventContext';

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

    // Parse dates and price
    const dates = parseDates(firstEvent.date, firstEvent.time);
    const price = parsePriceToNumber(firstEvent.cost);

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
  
  // Parse dates and price
  const dates = parseDates(date, time);
  const price = parsePriceToNumber(cost);
  
  console.log('[EventParser] Rule-based extraction results:');
  console.log('  - Title:', title || '(not found)');
  console.log('  - Dates:', dates.length > 0 ? JSON.stringify(dates) : '(not found)');
  console.log('  - Price:', price !== null && price !== undefined ? price : '(not found)');
  console.log('  - Address:', address || '(not found)');
  console.log('  - Website URL:', websiteUrl || '(not found)');
  console.log('  - Social Media:', socialMediaHandles ? JSON.stringify(socialMediaHandles) : '(not found)');
  console.log('  - Description:', description ? `${description.substring(0, 50)}...` : '(not found)');
  console.log('  - Organization:', organizationName || '(not found)');
  
  return {
    title,
    dates,
    price,
    address,
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

/**
 * Parses date and time strings into EventDate array format
 * Handles various formats:
 * - Single date: "9/11/2025" → [{start: "2025-09-11T00:00:00"}]
 * - Date with time: "9/11/2025 @ 7pm" → [{start: "2025-09-11T19:00:00"}]
 * - Date range: "September 11 - 14, 2025" → [{start: "2025-09-11T00:00:00"}, {start: "2025-09-12T00:00:00"}, ...]
 * - Time range: "9/11/2025 @ 7am - 12pm" → [{start: "2025-09-11T07:00:00", end: "2025-09-11T12:00:00"}]
 * - Multiple times: "9/11/2025 @ 12pm & 4pm" → [{start: "2025-09-11T12:00:00"}, {start: "2025-09-11T16:00:00"}]
 * - Month and day without year: "March 21" → same month/day in the current calendar year (local midnight)
 */
function tryParseMonthDayWithoutYear(trimmed: string): Date | null {
  const monthDayOnlyPattern =
    /^(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)\s+(\d{1,2})(?:st|nd|rd|th)?$/i;
  const match = trimmed.match(monthDayOnlyPattern);
  if (!match) return null;

  const monthToken = match[1].toLowerCase().replace(/\.$/, '');
  const day = parseInt(match[2], 10);
  const monthMap: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };
  const monthIndex = monthMap[monthToken];
  if (monthIndex === undefined || day < 1 || day > 31) return null;

  const year = new Date().getFullYear();
  const candidate = new Date(year, monthIndex, day, 0, 0, 0);
  if (candidate.getMonth() !== monthIndex) return null;
  return candidate;
}

export function parseDates(dateStr?: string, timeStr?: string): EventDate[] {
  if (!dateStr || dateStr.trim().length === 0) {
    console.log('[EventParser] No date string provided');
    return [];
  }

  const dates: EventDate[] = [];
  const trimmedDateStr = dateStr.trim();
  
  console.log('[EventParser] Parsing date string:', trimmedDateStr, 'with time:', timeStr || '(none)');
  
  try {
    // Handle ISO date range format: "2025-09-11 to 2025-09-14" or "2025-09-11 - 2025-09-14"
    const isoRangePattern = /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/i;
    const isoRangeMatch = trimmedDateStr.match(isoRangePattern);
    
    if (isoRangeMatch) {
      console.log('[EventParser] Matched ISO date range pattern');
      const startDate = new Date(isoRangeMatch[1] + 'T00:00:00');
      const endDate = new Date(isoRangeMatch[2] + 'T00:00:00');
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        console.log('[EventParser] Valid date range:', isoRangeMatch[1], 'to', isoRangeMatch[2]);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push({ start: d.toISOString() });
        }
        console.log('[EventParser] Generated', dates.length, 'date entries');
        return dates;
      } else {
        console.warn('[EventParser] Invalid dates in ISO range:', isoRangeMatch[1], isoRangeMatch[2]);
      }
    }
    
    // Parse date range patterns like "September 11 - 14, 2025" or "9/11 - 9/14/2025"
    const dateRangePattern = /(\w+\s+\d{1,2}|\d{1,2}\/\d{1,2})\s*-\s*(\d{1,2}|\d{1,2}\/\d{1,2}),?\s*(\d{4})/i;
    const rangeMatch = dateStr.match(dateRangePattern);
    
    if (rangeMatch) {
      // Extract year
      const year = parseInt(rangeMatch[3]);
      let startMonth: number, startDay: number, endMonth: number, endDay: number;
      
      // Parse start date
      const startPart = rangeMatch[1];
      if (startPart.includes('/')) {
        const [month, day] = startPart.split('/').map(Number);
        startMonth = month;
        startDay = day;
      } else {
        // Month name format
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
        const monthName = startPart.split(/\s+/)[0].toLowerCase();
        startMonth = monthNames.indexOf(monthName) + 1;
        startDay = parseInt(startPart.match(/\d+/)?.[0] || '1');
      }
      
      // Parse end date
      const endPart = rangeMatch[2];
      if (endPart.includes('/')) {
        const [month, day] = endPart.split('/').map(Number);
        endMonth = month;
        endDay = day;
      } else {
        endMonth = startMonth; // Assume same month if just day number
        endDay = parseInt(endPart);
      }
      
      // Generate dates for each day in range (local midnight, then store as UTC)
      const startDate = new Date(year, startMonth - 1, startDay, 0, 0, 0);
      const endDate = new Date(year, endMonth - 1, endDay, 0, 0, 0);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push({ start: d.toISOString() });
      }
      
      return dates;
    }
    
    // Parse single date
    let baseDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateStr)) {
      // ISO format (YYYY-MM-DD) - local midnight for that date, then store as UTC
      console.log('[EventParser] Parsing ISO format date');
      const [year, month, day] = trimmedDateStr.split('-').map(Number);
      baseDate = new Date(year, month - 1, day, 0, 0, 0);
    } else {
      const monthDayInferred = tryParseMonthDayWithoutYear(trimmedDateStr);
      if (monthDayInferred) {
        console.log('[EventParser] Parsed month/day without year:', monthDayInferred.toISOString());
        baseDate = monthDayInferred;
      } else {
      // Try parsing as-is - if it's a date string without time, parse components
      console.log('[EventParser] Attempting to parse date string as-is');
      const parsed = new Date(trimmedDateStr);
      if (!isNaN(parsed.getTime())) {
        // If the parsed date has no time component (or is at midnight), use local midnight then UTC
        // Otherwise preserve the time
        if (parsed.getHours() === 0 && parsed.getMinutes() === 0 && parsed.getSeconds() === 0) {
          // Date-only: local midnight for that calendar date, then store as UTC
          baseDate = new Date(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate(),
            0, 0, 0
          );
        } else {
          baseDate = parsed;
        }
      } else {
        baseDate = parsed;
      }
    }
    }
    
    if (isNaN(baseDate.getTime())) {
      console.warn('[EventParser] Failed to parse date string:', trimmedDateStr);
      return [];
    }
    
    console.log('[EventParser] Successfully parsed base date:', baseDate.toISOString());
    
    // Parse time string if provided
    if (timeStr) {
      // Check for time range like "7am - 12pm" or "7:00 AM - 12:00 PM"
      const timeRangePattern = /(\d{1,2}(?::\d{2})?)\s*(AM|PM|am|pm)?\s*-\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM|am|pm)?/i;
      const timeRangeMatch = timeStr.match(timeRangePattern);
      
      if (timeRangeMatch) {
        // Time range on same day
        const startTime = parseTimeString(timeRangeMatch[1], timeRangeMatch[2] || '');
        const endTime = parseTimeString(timeRangeMatch[3], timeRangeMatch[4] || '');
        
        const startDateTime = new Date(baseDate);
        startDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);
        
        const endDateTime = new Date(baseDate);
        endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
        
        dates.push({
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        });
      } else {
        // Check for multiple times like "12pm & 4pm"
        const multipleTimesPattern = /(\d{1,2}(?::\d{2})?\s*(AM|PM|am|pm)?)\s*(?:&|and)\s*(\d{1,2}(?::\d{2})?\s*(AM|PM|am|pm)?)/i;
        const multipleTimesMatch = timeStr.match(multipleTimesPattern);
        
        if (multipleTimesMatch) {
          // Multiple times on same day
          const time1 = parseTimeString(multipleTimesMatch[1], multipleTimesMatch[2] || '');
          const time2 = parseTimeString(multipleTimesMatch[3], multipleTimesMatch[4] || '');
          
          const dateTime1 = new Date(baseDate);
          dateTime1.setHours(time1.hours, time1.minutes, 0, 0);
          
          const dateTime2 = new Date(baseDate);
          dateTime2.setHours(time2.hours, time2.minutes, 0, 0);
          
          dates.push({ start: dateTime1.toISOString() });
          dates.push({ start: dateTime2.toISOString() });
        } else {
          // Single time
          const timeMatch = timeStr.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM|am|pm)?/i);
          if (timeMatch) {
            const time = parseTimeString(timeMatch[1], timeMatch[2] || '');
            const dateTime = new Date(baseDate);
            dateTime.setHours(time.hours, time.minutes, 0, 0);
            dates.push({ start: dateTime.toISOString() });
          } else {
            dates.push({ start: baseDate.toISOString() });
          }
        }
      }
    } else {
      // No time, just date
      dates.push({ start: baseDate.toISOString() });
    }
  } catch (error) {
    console.error('[EventParser] Error parsing dates:', error);
    // Fallback: try to create a single date entry
    try {
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        dates.push({ start: fallbackDate.toISOString() });
      }
    } catch {
      // Ignore
    }
  }
  
  return dates;
}

/**
 * Parses a time string to hours and minutes
 */
function parseTimeString(timeStr: string, ampm: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parts[1] ? parseInt(parts[1]) : 0;
  
  // Handle AM/PM
  if (ampm) {
    const isPM = ampm.toUpperCase() === 'PM';
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
  }
  
  return { hours, minutes };
}

/**
 * Parses a price string to a number
 * - "Free", "No charge", "Complimentary" → 0
 * - "$45" or "45 dollars" → 45
 * - Unknown/missing → null
 */
export function parsePriceToNumber(priceStr?: string): number | null {
  if (!priceStr) return null;
  
  const lowerPrice = priceStr.toLowerCase().trim();
  
  // Check for free
  if (lowerPrice === 'free' || lowerPrice.includes('no charge') || lowerPrice.includes('complimentary')) {
    return 0;
  }
  
  // Extract number from price string
  const numberMatch = priceStr.match(/\$?\s*(\d+(?:\.\d{2})?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }
  
  return null;
}

