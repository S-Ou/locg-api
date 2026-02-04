import { LOCG_URL } from "@/config";
import { GetComicsResponse, ApiError } from "@/types";
import { getCurrentDate } from "@/utils";

// In-memory cache for comic details
interface CacheEntry {
  data: { html: string; url: string };
  timestamp: number;
}

const comicCache = new Map<string, CacheEntry>();
const CACHE_TTL = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds

/**
 * Generates a cache key from comic parameters
 * @param comicId - The comic ID
 * @param title - The comic title slug
 * @param variantId - Optional variant ID
 * @returns Cache key string
 */
function getCacheKey(
  comicId: number,
  title: string,
  variantId?: string,
): string {
  return variantId ? `${comicId}:${title}:${variantId}` : `${comicId}:${title}`;
}

/**
 * Retrieves cached comic data if valid
 * @param key - Cache key
 * @returns Cached data or null if expired/missing
 */
function getCachedComic(key: string): { html: string; url: string } | null {
  const entry = comicCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    // Cache expired, remove it
    comicCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Stores comic data in cache
 * @param key - Cache key
 * @param data - Comic data to cache
 */
function setCachedComic(
  key: string,
  data: { html: string; url: string },
): void {
  comicCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Checks if an error should trigger a retry
 * @param error - The error to check
 * @returns True if the error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const isDnsError =
    error.message.includes("EAI_AGAIN") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("getaddrinfo");

  const isTimeout =
    error.message.includes("timeout") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("UND_ERR_CONNECT_TIMEOUT") ||
    error.message.includes("aborted");

  const isConnectionError =
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("EPIPE") ||
    error.message.includes("fetch failed");

  return isDnsError || isTimeout || isConnectionError;
}

/**
 * Generic retry wrapper for fetch operations
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts (default: 3)
 * @param context - Context string for logging
 * @returns Promise resolving to the function result
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  context: string = "operation",
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${retries} for ${context}`);
      }
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (!isLastAttempt && isRetryableError(error)) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `Retrying ${context} after ${delay}ms (attempt ${attempt + 1}/${retries}) - Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // This should never be reached due to throw in loop
  throw new Error(`Failed after ${retries} retries: ${context}`);
}

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
  params: Record<string, string | number | string[] | readonly string[]>,
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
  params?: Record<string, string | number | string[] | readonly string[]>,
): Promise<GetComicsResponse> {
  const url = new URL("/comic/get_comics", LOCG_URL);

  const finalParams = {
    ...DEFAULT_COMICS_PARAMS,
    date: getCurrentDate(),
    ...params,
  };

  const searchParams = buildSearchParams(finalParams);
  url.search = searchParams.toString();
  const urlString = url.toString();

  try {
    return await withRetry(
      async () => {
        console.log(`Fetching comics from LOCG: ${urlString}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(urlString, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "LOCG-API/1.0.1",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = new Error(
            `HTTP error! status: ${response.status}`,
          ) as ApiError;
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        return data;
      },
      3,
      urlString,
    );
  } catch (error) {
    console.error("Error fetching comics from LOCG:", urlString, error);
    throw error;
  }
}

/**
 * Fetches individual comic details from a League of Comic Geeks URL with retry logic and caching
 * @param comicId - The comic ID
 * @param title - The comic title slug
 * @param variantId - Optional variant ID for specific variants
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise resolving to the raw HTML content
 */
export async function getComic(
  comicId: number,
  title: string,
  variantId?: string,
  retries: number = 3,
): Promise<{
  html: string;
  url: string;
}> {
  // Check cache first
  const cacheKey = getCacheKey(comicId, title, variantId);
  const cached = getCachedComic(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${cacheKey}`);
    return cached;
  }

  // Construct the full URL
  const path = `/comic/${comicId}/${title}`;
  const baseUrl = `${LOCG_URL}${path}`;
  const finalUrl = variantId ? `${baseUrl}?variant=${variantId}` : baseUrl;

  try {
    const result = await withRetry(
      async () => {
        console.log(`Fetching comic from LOCG: ${finalUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(finalUrl, {
          method: "GET",
          headers: {
            "User-Agent": "LOCG-API/1.0.0",
            Accept: "*/*",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.error(
            `HTTP ${response.status} ${response.statusText} for ${finalUrl}`,
          );
          const error = new Error(
            `HTTP error! status: ${response.status} ${response.statusText}`,
          ) as ApiError;
          error.status = response.status;
          throw error;
        }

        const html = await response.text();
        console.log(
          `Successfully fetched ${html.length} characters from ${finalUrl}`,
        );

        return { html, url: finalUrl };
      },
      retries,
      finalUrl,
    );

    // Store in cache
    setCachedComic(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error fetching comic from LOCG:", finalUrl, error);
    throw error;
  }
}
