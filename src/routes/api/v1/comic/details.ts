import { Router, Request, Response } from "express";
import { getComic } from "@/services";
import { extractComicDetails } from "@/utils";

export const detailsRouter = Router();

/**
 * @swagger
 * /comic/details:
 *   get:
 *     summary: Get detailed comic information
 *     description: Fetches and parses detailed information about a specific comic from League of Comic Geeks
 *     tags:
 *       - Comics
 *     parameters:
 *       - in: query
 *         name: comicId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]+$'
 *         description: The League of Comic Geeks comic ID (numeric)
 *         example: "6731715"
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: The League of Comic Geeks comic slug (title part of the URL)
 *         example: "one-world-under-doom-6"
 *     responses:
 *       200:
 *         description: Successfully retrieved comic details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ComicDetails'
 *       400:
 *         description: Bad request - invalid or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             examples:
 *               missing-comicId:
 *                 summary: Missing or invalid comicId parameter
 *                 value:
 *                   error: "Missing or invalid 'comicId' query parameter"
 *                   examples:
 *                     - "/api/v1/comic/details?comicId=6731715&title=one-world-under-doom-6"
 *               missing-title:
 *                 summary: Missing or invalid title parameter
 *                 value:
 *                   error: "Missing or invalid 'title' query parameter"
 *                   examples:
 *                     - "/api/v1/comic/details?comicId=6731715&title=one-world-under-doom-6"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
detailsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { comicId, title } = req.query;

    if (!comicId || typeof comicId !== "string" || !/^[0-9]+$/.test(comicId)) {
      return res.status(400).json({
        error: "Missing or invalid 'comicId' query parameter",
        examples: [
          "/api/v1/comic/details?comicId=6731715&title=one-world-under-doom-6",
        ],
      });
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: "Missing or invalid 'title' query parameter",
        examples: [
          "/api/v1/comic/details?comicId=6731715&title=one-world-under-doom-6",
        ],
      });
    }

    // Construct the full URL
    const path = `/comic/${comicId}/${title}`;
    const fullUrl = `https://leagueofcomicgeeks.com${path}`;

    console.log(`Fetching comic details from: ${fullUrl}`);

    // Fetch the comic page HTML
    const html = await getComic(fullUrl);

    // Extract comic details from HTML
    const comicDetails = extractComicDetails(html);

    res.json(comicDetails);
  } catch (error) {
    console.error("Error fetching comic details:", error);

    const statusCode = (error as any)?.status || 500;
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    res.status(statusCode).json({
      error: message,
    });
  }
});
