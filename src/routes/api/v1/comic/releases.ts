import { getComics } from "@/services";
import { extractComicData } from "@/utils/htmlParser";
import { Router } from "express";

export const releaseRouter = Router();

/**
 * @swagger
 * /comic/releases:
 *   get:
 *     summary: Get comic releases
 *     description: Fetches the latest comic releases from League of Comic Geeks
 *     tags:
 *       - Comics
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for releases (YYYY-MM-DD format). Defaults to current date if not provided.
 *       - in: query
 *         name: issue
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include regular issues
 *       - in: query
 *         name: annual
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include annuals
 *       - in: query
 *         name: digital
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include digital chapters
 *       - in: query
 *         name: variant
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include variants and reprints
 *       - in: query
 *         name: trade
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include trade paperbacks
 *       - in: query
 *         name: hardcover
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include hardcovers
 *       - in: query
 *         name: publisher
 *         schema:
 *           type: integer
 *         description: |
 *           Publisher ID to filter by. Popular publishers:
 *           * 1 - DC Comics
 *           * 2 - Marvel Comics
 *           * 5 - Dark Horse Comics
 *           * 6 - IDW Publishing
 *           * 7 - Image Comics
 *           * 12 - Dynamite
 *           * 13 - BOOM! Studios
 *           * 20 - VIZ Media
 *           * 21 - Archie Comics
 *           * 29 - Oni Press
 *           * 716 - Bad Idea Comics
 *           * 1044 - Webtoon
 *     responses:
 *       200:
 *         description: Successfully retrieved comic releases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ComicData'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
releaseRouter.get("/", async (req, res) => {
  try {
    const {
      date,
      issue = "true",
      annual = "true",
      digital = "true",
      variant = "false",
      trade = "true",
      hardcover = "true",
      publisher,
    } = req.query;

    // Build format array based on boolean flags
    const formats: string[] = [];
    if (issue === "true") formats.push("1");
    if (annual === "true") formats.push("6");
    if (digital === "true") formats.push("5");
    if (variant === "true") formats.push("2");
    if (trade === "true") formats.push("3");
    if (hardcover === "true") formats.push("4");

    // Build query parameters
    const params: Record<string, string | string[]> = {
      "format[]": formats,
    };

    // Add date if provided
    if (date && typeof date === "string") {
      params.date = date;
    }

    // Add publisher if provided
    if (publisher && typeof publisher === "string") {
      params["publisher[]"] = [publisher];
    }

    const data = await getComics(params);
    const comics = extractComicData(data.list);
    res.json(comics);
  } catch (error) {
    console.error("Error fetching comic releases:", error);
    res.status(500).json({
      error: "Failed to fetch comic releases",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
possible formats:
regular issue = 1
annual = 6
digital chapter = 5
variant & reprint = 2
trade paperback = 3
hardcover = 4

popular publishers, albeit this is only a selection of a very large list:
1 - DC Comics  
2 - Marvel Comics  
5 - Dark Horse Comics  
6 - IDW Publishing
7 - Image Comics  
12 - Dynamite  
13 - BOOM! Studios  
20 - VIZ Media  
21 - Archie Comics  
29 - Oni Press  
716 - Bad Idea Comics  
1044 - Webtoon  
*/
