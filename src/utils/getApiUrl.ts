/**
 * Utility to extract the title path from a comic URL
 * @param url - The comic URL (e.g., "/comic/123456/moon-knight-fist-of-khonshu-11")
 * @returns The title path slug (e.g., "moon-knight-fist-of-khonshu-11")
 */
export function extractTitlePath(url: string): string {
  if (!url) return "";

  // Match pattern: /comic/{id}/{title-path}
  const match = url.match(/^\/comic\/\d+\/([^\/]+)$/);
  return match ? match[1] : "";
}
