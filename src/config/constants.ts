export const LOCG_URL =
  process.env.LOCG_URL || "https://leagueofcomicgeeks.com";

// ...existing code...

export const RESPONSE_MESSAGES = {
  SUCCESS: "Success",
  ERROR: "An error occurred",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  VALIDATION_ERROR: "Validation error",
} as const;
