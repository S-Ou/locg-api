import { LOGC_URL } from "@/config";
import { ApiError, LogcConfigurator, GetComicsResponse } from "@/types";
import { getCurrentDate } from "@/utils";

// Default query parameters for the LOGC API
export const DEFAULT_COMICS_PARAMS = {
  addons: "1",
  list: "releases",
  order: "alpha-asc",
  "format[]": ["1", "6"],
  "publisher[]": [], // Marvel is 2
  date_type: "week",
  date: getCurrentDate(),
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
  try {
    const finalParams = { ...DEFAULT_COMICS_PARAMS, ...params };

    const searchParams = buildSearchParams(finalParams);

    const url = new URL("/comic/get_comics", LOGC_URL);
    url.search = searchParams.toString();

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "LOGC-API/1.0.0",
      },
    });

    if (!response.ok) {
      const error = new Error(
        `HTTP error! status: ${response.status}`
      ) as ApiError;
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching comics from LOGC:", error);
    throw error;
  }
}
