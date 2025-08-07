import { Router, Request, Response } from "express";
import { getComic } from "@/services";
import { extractComicDetails } from "@/utils";

export const comicRouter = Router();

/**
 * GET /api/v1/comic/details
 * Fetches and parses detailed information about a specific comic
 * Query params:
 *   - url: The League of Comic Geeks URL for the comic
 */
comicRouter.get("/details", async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        error: "Missing or invalid 'url' query parameter",
        examples: [
          "/api/v1/comic/details?url=https://leagueofcomicgeeks.com/comic/6731715/one-world-under-doom-6",
          "/api/v1/comic/details?url=/comic/6731715/one-world-under-doom-6",
        ],
      });
    }

    // Validate and normalize the URL
    let fullUrl: string;

    // Check if it's a full URL or just a path
    if (url.startsWith("https://leagueofcomicgeeks.com/")) {
      // Full URL format
      const fullUrlPattern =
        /^https:\/\/leagueofcomicgeeks\.com\/comic\/\d+\/.+/;
      if (!fullUrlPattern.test(url)) {
        return res.status(400).json({
          error: "Invalid League of Comic Geeks comic URL format",
          expected: "https://leagueofcomicgeeks.com/comic/{id}/{slug}",
        });
      }
      fullUrl = url;
    } else if (url.startsWith("/comic/")) {
      // Path-only format
      const pathPattern = /^\/comic\/\d+\/.+/;
      if (!pathPattern.test(url)) {
        return res.status(400).json({
          error: "Invalid comic path format",
          expected: "/comic/{id}/{slug}",
        });
      }
      fullUrl = `https://leagueofcomicgeeks.com${url}`;
    } else {
      return res.status(400).json({
        error:
          "URL must be either a full League of Comic Geeks URL or a comic path",
        examples: [
          "https://leagueofcomicgeeks.com/comic/6731715/one-world-under-doom-6",
          "/comic/6731715/one-world-under-doom-6",
        ],
      });
    }

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
