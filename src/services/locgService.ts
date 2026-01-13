import { LOCG_URL } from "@/config";
import { GetComicsResponse, ApiError } from "@/types";
import { getCurrentDate } from "@/utils";

// Default query parameters for the LOCG API
export const DEFAULT_COMICS_PARAMS = {
  addons: "1",
  list: "releases",
  order: "alpha-asc",
  "format[]": ["1", "3", "4", "5", "6"],
  "publisher[]": [], // Marvel is 2
  date_type: "week",
};

/**
 * Builds URL search parameters, handling array values correctly
 * @param params - Parameters object
 * @returns URLSearchParams instance
 */
function buildSearchParams(
  params: Record<string, string | number | string[] | readonly string[]>
): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // Handle array parameters (like format[])
      value.forEach((item) => {
        searchParams.append(key, String(item));
      });
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Fetches comics from the League of Comic Geeks API
 * @param params - Optional query parameters (will be merged with defaults)
 * @returns Promise resolving to the comics data
 */
export async function getComics(
  params?: Record<string, string | number | string[] | readonly string[]>
): Promise<GetComicsResponse> {
  const url = new URL("/comic/get_comics", LOCG_URL);

  try {
    const finalParams = {
      ...DEFAULT_COMICS_PARAMS,
      date: getCurrentDate(),
      ...params,
    };

    const searchParams = buildSearchParams(finalParams);

    url.search = searchParams.toString();

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "LOCG-API/1.0.1",
      },
    });

    if (!response.ok) {
      const error = new Error(
        `HTTP error! status: ${response.status}`
      ) as ApiError;
      error.status = response.status;
      throw error;
    }

    console.log(`Fetched comics from LOCG: ${url.toString()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching comics from LOCG:", url.toString(), error);
    throw error;
  }
}

/**
 * Fetches individual comic details from a League of Comic Geeks URL
 * @param comicId - The comic ID
 * @param title - The comic title slug
 * @param variantId - Optional variant ID for specific variants
 * @returns Promise resolving to the raw HTML content
 */
export async function getComic(
  comicId: number,
  title: string,
  variantId?: string
): Promise<{
  html: string;
  url: string;
}> {
  var finalUrl = "";
  try {
    // Construct the full URL
    const path = `/comic/${comicId}/${title}`;
    const baseUrl = `${LOCG_URL}${path}`;

    // If variant ID is provided, add it as a query parameter
    finalUrl = variantId ? `${baseUrl}?variant=${variantId}` : baseUrl;
    console.log(`Fetching comic from LOCG: ${finalUrl}`);

    // Make the request to the comic page
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "User-Agent": "LOCG-API/1.0.0",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    if (!response.ok) {
      console.error(
        `HTTP ${response.status} ${response.statusText} for ${finalUrl}`
      );
      const error = new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      ) as ApiError;
      error.status = response.status;
      throw error;
    }

    const html = await response.text();
    console.log(
      `Successfully fetched ${html.length} characters from ${finalUrl}`
    );
    return { html, url: finalUrl };
  } catch (error) {
    console.error("Error fetching comic from LOCG:", finalUrl, error);
    throw error;
  }
}
