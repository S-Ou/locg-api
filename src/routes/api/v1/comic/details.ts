import { Router, Request, Response } from "express";
import { getComic } from "@/services";
import { extractComicDetails } from "@/utils";
import { ComicRequest, ComicDetails } from "@/types";

export const detailsRouter = Router();

/**
 * @swagger
 * /comic/details:
 *   post:
 *     summary: Get detailed comic information for multiple comics
 *     description: Fetches and parses detailed information about multiple comics from League of Comic Geeks
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
 *                 # ... other ComicDetails properties
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
          const html = await getComic(comicId, title, variantId);

          // Extract comic details from HTML
          const comicDetails = extractComicDetails(html);

          return comicDetails;
        } catch (error) {
          console.error(
            `Error fetching comic ${request.comicId}/${request.title}:`,
            error
          );

          const statusCode = (error as any)?.status || 500;
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
