import { EventDate } from '../contexts/EventContext';

/**
 * Formats a date string to a readable format like "Wednesday, Dec 17th"
 * @deprecated Use formatEventDates instead for new date structure
 */
export function formatEventDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Try to parse the date - handle various formats
    let date: Date;
    
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
    } else {
      // Try to parse as-is
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // If parsing failed, return the original string
      return dateString;
    }
    
    // Get day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[date.getDay()];
    
    // Get month abbreviation
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    
    // Get day with ordinal suffix
    const day = date.getDate();
    const dayWithOrdinal = getOrdinalSuffix(day);
    
    return `${dayOfWeek}, ${month} ${dayWithOrdinal}`;
  } catch (error) {
    // If anything fails, return the original string
    return dateString;
  }
}

/**
 * Adds ordinal suffix to a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }
  
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/**
 * Formats time string to a readable format
 * @deprecated Use formatEventDates instead for new date structure
 */
export function formatEventTime(timeString: string): string {
  if (!timeString) return '';
  
  // If it's already in a readable format, return as-is
  // Otherwise, try to format it
  return timeString.trim();
}

/**
 * Formats an array of EventDate objects to a readable string
 * Handles single dates, date ranges, multiple dates, and time ranges
 */
export function formatEventDates(dates: EventDate[]): string {
  if (!dates || dates.length === 0) return '';

  if (dates.length === 1) {
    return formatSingleDate(dates[0]);
  }

  // Multiple dates - format as range or list
  const firstDate = new Date(dates[0].start);
  const lastDate = new Date(dates[dates.length - 1].start);
  
  // Check if dates are consecutive
  const isConsecutive = dates.every((date, index) => {
    if (index === 0) return true;
    const currentDate = new Date(date.start);
    const prevDate = new Date(dates[index - 1].start);
    const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  });

  if (isConsecutive && dates.length > 1) {
    // Format as date range
    const startFormatted = formatDateOnly(firstDate);
    const endFormatted = formatDateOnly(lastDate);
    
    // Check if same month
    if (firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear()) {
      return `${formatDateOnly(firstDate)} - ${lastDate.getDate()}${getOrdinalSuffix(lastDate.getDate()).slice(-2)}, ${formatYear(firstDate)}`;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  }

  // Multiple non-consecutive dates - format as list
  return dates.map(date => formatSingleDate(date)).join(', ');
}

/**
 * Formats a single EventDate object
 */
function formatSingleDate(date: EventDate): string {
  const startDate = new Date(date.start);
  
  // Check if this is a date-only event (time is midnight or close to it in UTC)
  // When dates are stored as "2025-09-11T00:00:00.000Z", they represent date-only events
  const utcHours = startDate.getUTCHours();
  const utcMinutes = startDate.getUTCMinutes();
  const isDateOnly = utcHours === 0 && utcMinutes === 0;
  
  let formatted = formatDateOnly(startDate);
  
  // Only add time if it's not a date-only event
  // For date-only events, we use local date components but don't show time
  if (!isDateOnly) {
    const localHours = startDate.getHours();
    const localMinutes = startDate.getMinutes();
    if (localHours !== 0 || localMinutes !== 0) {
      formatted += ` @ ${formatTime(startDate)}`;
    }
  }
  
  // Add end time if present and not date-only
  if (date.end && !isDateOnly) {
    const endDate = new Date(date.end);
    formatted += ` - ${formatTime(endDate)}`;
  }
  
  return formatted;
}

/**
 * Formats a date without time (e.g., "Wednesday, Dec 17th, 2025")
 * Uses UTC date components to avoid timezone issues for date-only events
 */
export function formatDateOnly(date: Date): string {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // For date-only events stored in UTC, use UTC components to get the correct date
  // Otherwise use local components
  const isLikelyDateOnly = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  
  let dayOfWeek: string;
  let month: string;
  let day: number;
  let year: number;
  
  if (isLikelyDateOnly) {
    // Use UTC components to preserve the intended date
    const utcDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    dayOfWeek = daysOfWeek[utcDate.getUTCDay()];
    month = months[utcDate.getUTCMonth()];
    day = utcDate.getUTCDate();
    year = utcDate.getUTCFullYear();
  } else {
    // Use local components for events with specific times
    dayOfWeek = daysOfWeek[date.getDay()];
    month = months[date.getMonth()];
    day = date.getDate();
    year = date.getFullYear();
  }
  
  const dayWithOrdinal = getOrdinalSuffix(day);
  
  return `${dayOfWeek}, ${month} ${dayWithOrdinal}, ${year}`;
}

/**
 * Formats a time (e.g., "7:00 PM")
 */
export function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  if (hours === 0) hours = 12;
  
  if (minutes === 0) {
    return `${hours} ${ampm}`;
  }
  
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Formats just the year
 */
function formatYear(date: Date): string {
  return date.getFullYear().toString();
}

