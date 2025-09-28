// Helper to format a date object to 'YYYY-MM-DD' string for the API
const toYYYYMMDD = (date) => {
  // We need to adjust for timezone offsets when formatting
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  const localDate = new Date(date.getTime() - tzOffset);
  return localDate.toISOString().split('T')[0];
};

// Helper to format a date for display labels (e.g., "15 sep. 2025")
const formatDisplayDate = (date) => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC' // Use UTC to avoid off-by-one day errors in labels
  });
};

// The start of a known pay period. All other periods are calculated from this.
const ANCHOR_DATE = new Date('2025-09-15T00:00:00Z');
const PERIOD_IN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

/**
 * Calculates the start date of the 14-day pay period for any given date.
 * @param {Date} date The date to find the period for.
 * @returns {Date} The exact start date of the pay period.
 */
const getFortnightStartDateForDate = (date) => {
    // Work with UTC to avoid timezone shifting issues
    const targetDateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const anchorDateUTC = ANCHOR_DATE.getTime();

    const timeDiff = targetDateUTC - anchorDateUTC;
    const periodsPassed = Math.floor(timeDiff / PERIOD_IN_MS);
    const currentPeriodStartMillis = anchorDateUTC + (periodsPassed * PERIOD_IN_MS);
    
    return new Date(currentPeriodStartMillis);
};


/**
 * Generates a list of the last 12 pay periods for a dropdown menu.
 */
export const getFortnightOptions = () => {
    const options = [];
    const today = new Date();
    
    let currentPeriodStartDate = getFortnightStartDateForDate(today);

    for (let i = 0; i < 12; i++) {
        const startDate = new Date(currentPeriodStartDate);
        
        // The end date is always 13 days after the start date (for a total of 14 days)
        const endDate = new Date(startDate.getTime() + (13 * 24 * 60 * 60 * 1000));

        const value = toYYYYMMDD(startDate);
        const label = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
        options.push({ value, label });

        // Move to the start date of the previous period by subtracting 14 days
        currentPeriodStartDate.setTime(currentPeriodStartDate.getTime() - PERIOD_IN_MS);
    }

    return options;
};

/**
 * Returns the start date of the current fortnight as a 'YYYY-MM-DD' string.
 * This is used by TableView to always show the current data.
 */
export const getFortnightStartDate = () => {
  const today = new Date();
  const startDate = getFortnightStartDateForDate(today);
  return toYYYYMMDD(startDate);
};
