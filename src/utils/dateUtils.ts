/**
 * Gets the current date in YYYY-MM-DD format
 * @returns Current date string
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Parses a date string from the LOCG API into a Date object
 * @param dateString - Date string like "Aug 6th, 2025" or "Aug 7th, 2025"
 * @returns Date object
 */
export function parseComicDate(dateString: string): Date {
  if (!dateString || dateString.trim() === "") {
    return new Date();
  }

  // Remove ordinal suffixes (st, nd, rd, th) and parse
  const cleanDateString = dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");

  const parsedDate = new Date(cleanDateString);

  // If parsing fails, return current date
  if (isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

/**
 * Returns the ISO date (YYYY-MM-DD) of the Monday of the week containing the given ISO date.
 */
export function weekAnchor(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
