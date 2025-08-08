/**
 * Utility to generate the API details URL for a comic
 * @param comicId - The comic's numeric ID
 * @param title - The comic's slug/title
 * @returns The API endpoint URL for comic details
 */
export function getComicDetailsUrl(
  comicId: string | number,
  title: string
): string {
  return `/api/v1/comic/details?comicId=${encodeURIComponent(
    comicId
  )}&title=${encodeURIComponent(title)}`;
}
