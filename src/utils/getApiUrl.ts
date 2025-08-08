/**
 * Utility to extract the title path from a comic URL
 * @param url - The comic URL (e.g., "/comic/123456/moon-knight-fist-of-khonshu-11" or "/comic/123456/original-sin-tp?variant=8244122")
 * @returns The title path slug (e.g., "moon-knight-fist-of-khonshu-11" or "original-sin-tp")
 */
export function extractTitlePath(url: string): string {
  if (!url) return "";

  // Remove query parameters first
  const urlWithoutQuery = url.split("?")[0];

  // Match pattern: /comic/{id}/{title-path}
  const match = urlWithoutQuery.match(/^\/comic\/\d+\/([^\/]+)$/);
  return match ? match[1] : "";
}
