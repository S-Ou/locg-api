import { Router, Request, Response } from "express";
import { getComic, getComics, enqueueDetailRetry } from "@/services";
import { extractComicDetails, extractComicData } from "@/utils";
import { ComicRequest, ComicDetails, ComicData } from "@/types";

export const detailsRouter = Router();

const FALLBACK_STATUS_CODES = [401, 403, 429];
const FALLBACK_LIST_TTL_MS = Number(process.env.FALLBACK_LIST_TTL_MS) || 60 * 60 * 1000;
const FALLBACK_FORMATS: Array<{ id: string; name: string }> = [
  { id: "1", name: "Comic" },
  { id: "2", name: "Comic" },
  { id: "3", name: "Trade Paperback" },
  { id: "4", name: "Hardcover" },
  { id: "5", name: "Digital Chapter" },
  { id: "6", name: "Annual" },
];

type FallbackEntry = ComicData & { format: string };

let fallbackListCache: { data: FallbackEntry[]; timestamp: number } | null = null;
let fallbackListPromise: Promise<FallbackEntry[]> | null = null;

async function buildFallbackList(): Promise<FallbackEntry[]> {
  const settled = await Promise.allSettled(
    FALLBACK_FORMATS.map(async ({ id, name }) => {
      const data = await getComics({ "format[]": [id] });
      return extractComicData(data.list).map((comic) => ({ ...comic, format: name }));
    }),
  );
  const lists: FallbackEntry[][] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      lists.push(result.value);
    } else {
      console.warn(`Fallback format fetch failed (${FALLBACK_FORMATS[i].name}):`, result.reason);
    }
  });
  if (lists.length === 0) {
    throw new Error("All fallback format fetches failed");
  }
  return lists.flat();
}

function getFallbackList(): Promise<FallbackEntry[]> {
  if (fallbackListCache && Date.now() - fallbackListCache.timestamp < FALLBACK_LIST_TTL_MS) {
    return Promise.resolve(fallbackListCache.data);
  }
  if (!fallbackListPromise) {
    fallbackListPromise = buildFallbackList()
      .then((data) => {
        fallbackListCache = { data, timestamp: Date.now() };
        return data;
      })
      .finally(() => {
        fallbackListPromise = null;
      });
  }
  return fallbackListPromise;
}

function findFallbackEntry(
  comics: FallbackEntry[],
  comicId: number,
  variantId?: string | null,
): FallbackEntry | undefined {
  if (variantId) {
    return comics.find((c) => String(c.variantId) === String(variantId));
  }
  return (
    comics.find((c) => c.id === comicId && c.variantId === undefined) ??
    comics.find((c) => c.id === comicId)
  );
}

function synthesizeComicDetails(entry: FallbackEntry, comicId: number): ComicDetails {
  return {
    id: comicId,
    title: entry.title,
    issueNumber: entry.title.match(/#(\d+)/)?.[1] ?? "",
    publisher: entry.publisher,
    description: "",
    coverDate: "",
    releaseDate: entry.date,
    pages: 0,
    price: entry.price,
    format: entry.format,
    upc: null,
    isbn: null,
    distributorSku: "",
    finalOrderCutoff: "",
    coverImage: entry.coverImage.replace("/medium-", "/large-"),
    url: entry.url,
    rating: 0,
    ratingCount: 0,
    ratingText: "",
    pulls: entry.pulls,
    collected: 0,
    read: 0,
    wanted: 0,
    seriesUrl: "",
    creators: [],
    characters: [],
    variants: [],
    stories: [],
  };
}

/**
 * @swagger
 * /comic/details:
 *   post:
 *     summary: Get detailed comic information for multiple comics
 *     description: Fetches and parses detailed information about multiple comics from League of Comic Geeks.
 *       If a detail page is blocked (HTTP 401/403) or rate limited (HTTP 429), degraded details
 *       synthesized from the releases list are returned; 429s are re-fetched in the background.
 *     tags:
 *       - Comics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/ComicRequest'
 *           example:
 *             - comicId: 6731715
 *               title: "one-world-under-doom-6"
 *             - comicId: 6141826
 *               title: "fall-of-the-house-of-x-rise-of-the-powers-of-x-omnibus-hc"
 *               variantId: "8330026"
 *     responses:
 *       200:
 *         description: Successfully retrieved comic details for all requested comics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/ComicDetails'
 *                   - $ref: '#/components/schemas/ComicError'
 *             example:
 *               - id: 6731715
 *                 title: "One World Under Doom #6"
 *                 issueNumber: "6"
 *                 publisher: "Marvel"
 *                 releaseDate: "2024-06-12"
 *                 coverImage: "https://example.com/covers/6731715.jpg"
 *                 description: "Doctor Doom faces his greatest challenge yet."
 *                 creators:
 *                   writers: ["Al Ewing"]
 *                   artists: ["Leonard Kirk"]
 *                   coverArtists: ["Mateus Manhanini"]
 *                 pageCount: 32
 *                 price: "$4.99"
 *                 variantId: null
 *                 series: "One World Under Doom"
 *                 genres: ["Superhero", "Action"]
 *                 format: "Comic"
 *                 rating: "T"
 *                 isVariant: false
 *                 leagueUrl: "https://leagueofcomicgeeks.com/comic/6731715/one-world-under-doom-6"
 *               - error: "Comic not found"
 *                 comicId: 5886165
 *                 title: "moon-knight-fist-of-khonshu-11"
 *       400:
 *         description: Bad request - invalid request body format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             examples:
 *               invalid-body:
 *                 summary: Invalid request body format
 *                 value:
 *                   error: "Request body must be an array of comic requests"
 *               invalid-comic-request:
 *                 summary: Invalid comic request format
 *                 value:
 *                   error: "Each comic request must have a numeric comicId and a non-empty title string"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
detailsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const comicRequests: ComicRequest[] = req.body;

    // Validate request body
    if (!Array.isArray(comicRequests)) {
      return res.status(400).json({
        error: "Request body must be an array of comic requests",
      });
    }

    if (comicRequests.length === 0) {
      return res.status(400).json({
        error: "Request body must contain at least one comic request",
      });
    }

    // Validate each comic request
    for (const request of comicRequests) {
      if (
        !request ||
        typeof request.comicId !== "number" ||
        !Number.isInteger(request.comicId) ||
        request.comicId <= 0 ||
        !request.title ||
        typeof request.title !== "string" ||
        !request.title.trim()
      ) {
        return res.status(400).json({
          error:
            "Each comic request must have a numeric comicId and a non-empty title string",
        });
      }
    }

    console.log(`Processing ${comicRequests.length} comic requests`);

    // Process each comic request
    const results = await Promise.allSettled(
      comicRequests.map(async (request) => {
        try {
          const { comicId, title, variantId } = request;

          // Fetch the comic page HTML
          const { html, url } = await getComic(comicId, title, variantId);

          // Extract comic details from HTML
          const comicDetails = extractComicDetails(html);
          comicDetails.url = url;

          return comicDetails;
        } catch (error) {
          console.error(
            `Error fetching comic ${request.comicId}/${request.title}:`,
            error
          );

          const statusCode = (error as any)?.status || 500;

          if (FALLBACK_STATUS_CODES.includes(statusCode)) {
            try {
              const fallbackList = await getFallbackList();
              const entry = findFallbackEntry(fallbackList, request.comicId, request.variantId);
              if (entry) {
                console.warn(
                  `Synthesized degraded details for ${request.comicId}/${request.title} from releases list (upstream ${statusCode})`,
                );
                if (statusCode === 429) {
                  enqueueDetailRetry(request.comicId, request.title, request.variantId);
                }
                return synthesizeComicDetails(entry, request.comicId);
              }
              console.warn(`No releases-list match for ${request.comicId}/${request.title}; returning error`);
            } catch (fallbackError) {
              console.error(`Fallback list fetch failed for ${request.comicId}/${request.title}:`, fallbackError);
            }
          }

          const message =
            error instanceof Error ? error.message : "Unknown error occurred";

          return {
            error: message,
            comicId: request.comicId,
            title: request.title,
            statusCode,
          };
        }
      })
    );

    // Transform results to return both successful and failed requests
    const responseData = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // This shouldn't happen with our current implementation since we catch errors above
        return {
          error: "Failed to process comic request",
          comicId: comicRequests[index].comicId,
          title: comicRequests[index].title,
          statusCode: 500,
        };
      }
    });

    res.json(responseData);
  } catch (error) {
    console.error("Error processing comic details requests:", error);

    const statusCode = (error as any)?.status || 500;
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    res.status(statusCode).json({
      error: message,
    });
  }
});
