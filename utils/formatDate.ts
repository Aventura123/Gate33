import { Timestamp } from 'firebase/firestore';

/**
 * Formats a date from various potential formats (Firestore Timestamp, Date object, or string)
 * into a human-readable string.
 */
export const formatDate = (date: Date | Timestamp | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'object') {
      if ('toDate' in date && typeof date.toDate === 'function') {
        // It's a Firestore Timestamp
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        // It's already a JavaScript Date
        dateObj = date;
      } else {
        return 'Invalid date';
      }
    } else if (typeof date === 'string') {
      // It's a date string
      dateObj = new Date(date);
    } else {
      return 'Invalid date';
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    // Format the date
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};
