import { LOGC_URL } from "@/config";
import { ApiError, GetComicsResponse } from "@/types";
import { getCurrentDate } from "@/utils";

// Session cookie cache
interface SessionCache {
  cookie: string;
  expiresAt: number;
}

let sessionCache: SessionCache | null = null;

/**
 * Fetches a session cookie from League of Comic Geeks
 * @returns Promise resolving to a cookie string or empty string if failed
 */
async function getSessionCookie(): Promise<string> {
  try {
    // Check if we have a valid cached session
    if (sessionCache && Date.now() < sessionCache.expiresAt) {
      console.log("Using cached session cookie");
      return sessionCache.cookie;
    }

    console.log("Fetching new session cookie...");
    const sessionResponse = await fetch("https://leagueofcomicgeeks.com/", {
      method: "GET",
      headers: {
        "User-Agent": "PostmanRuntime/7.45.0",
        Accept: "*/*",
        "Cache-Control": "no-cache",
      },
    });

    if (!sessionResponse.ok) {
      console.error(
        `Failed to get session: ${sessionResponse.status} ${sessionResponse.statusText}`
      );
      return "";
    }

    // Extract cookies from the session response
    const setCookieHeader = sessionResponse.headers.get("set-cookie");
    let cookies = "";

    if (setCookieHeader) {
      // Parse the set-cookie header to extract the session cookie
      const cookieMatch = setCookieHeader.match(/ci_session=([^;]+)/);
      if (cookieMatch) {
        cookies = `ci_session=${cookieMatch[1]}`;
        console.log(`Got session cookie: ${cookies}`);

        // Cache the cookie for 30 minutes (typical session duration)
        sessionCache = {
          cookie: cookies,
          expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        };
      } else {
        // If we didn't get a ci_session cookie, try to use all cookies
        cookies = setCookieHeader
          .split(",")
          .map((cookie) => cookie.split(";")[0].trim())
          .join("; ");
        console.log(`Using all cookies: ${cookies}`);

        // Cache for a shorter time if we're not sure about the cookie type
        sessionCache = {
          cookie: cookies,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        };
      }
    }

    return cookies;
  } catch (error) {
    console.error("Error fetching session cookie:", error);
    return "";
  }
}

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

/**
 * Fetches individual comic details from a League of Comic Geeks URL
 * @param url - The comic URL (e.g., "https://leagueofcomicgeeks.com/comic/6731715/one-world-under-doom-6")
 * @returns Promise resolving to the raw HTML content
 */
export async function getComic(url: string): Promise<string> {
  try {
    console.log(`Fetching comic from LOGC: ${url}`);

    // Get session cookie (will use cache if available)
    const cookies = await getSessionCookie();

    if (!cookies) {
      console.warn("No session cookie available, request might fail");
    }

    // Make the request to the comic page with the session cookie
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "PostmanRuntime/7.45.0",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...(cookies && { Cookie: cookies }),
      },
    });

    if (!response.ok) {
      console.error(
        `HTTP ${response.status} ${response.statusText} for ${url}`
      );

      // If we get a 403 and have a cached cookie, try refreshing the session
      if (response.status === 403 && sessionCache) {
        console.log("Got 403 with cached cookie, trying to refresh session...");
        sessionCache = null; // Clear cache
        const newCookies = await getSessionCookie();

        if (newCookies) {
          // Retry with fresh cookie
          const retryResponse = await fetch(url, {
            method: "GET",
            headers: {
              "User-Agent": "PostmanRuntime/7.45.0",
              Accept: "*/*",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              Cookie: newCookies,
            },
          });

          if (retryResponse.ok) {
            const html = await retryResponse.text();
            console.log(
              `Successfully fetched ${html.length} characters from ${url} (after retry)`
            );
            return html;
          }
        }
      }

      const error = new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      ) as ApiError;
      error.status = response.status;
      throw error;
    }

    const html = await response.text();
    console.log(`Successfully fetched ${html.length} characters from ${url}`);
    return html;
  } catch (error) {
    console.error("Error fetching comic from LOGC:", error);
    throw error;
  }
}
