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
  const data = await getComics();
  const comics = extractComicData(data.list);
  res.json(comics);
});
