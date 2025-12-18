/**
 * Formats a date string to a readable format like "Wednesday, Dec 17th"
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
 */
export function formatEventTime(timeString: string): string {
  if (!timeString) return '';
  
  // If it's already in a readable format, return as-is
  // Otherwise, try to format it
  return timeString.trim();
}

