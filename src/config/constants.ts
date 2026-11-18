// URL to fetch data from
export const LOCG_FETCH_URL =
  process.env.LOCG_FETCH_URL || "https://leagueofcomicgeeks.com";

// URL to display in responses
export const LOCG_DISPLAY_URL =
  process.env.LOCG_DISPLAY_URL || "https://leagueofcomicgeeks.com";

// Path to the SQLite week cache database
export const SQLITE_PATH =
  process.env.SQLITE_PATH || "./data/week-cache.sqlite";

export const RESPONSE_MESSAGES = {
  SUCCESS: "Success",
  ERROR: "An error occurred",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  VALIDATION_ERROR: "Validation error",
} as const;
