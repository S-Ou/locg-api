import { Router, Request, Response } from "express";

import { getComics, getWeek, upsertWeek } from "@/services";
import { extractComicData } from "@/utils/htmlParser";
import { dedupeComics } from "@/utils/parsingUtils";
import { getCurrentDate, weekAnchor } from "@/utils/dateUtils";
import type { ComicData, ComicDetails, ComicRequest } from "@/types/locg";
import { fetchComicDetailsFor } from "./details";

export const weekRouter = Router();

/**
 * @swagger
 * /comic/week:
 *   get:
 *     summary: Get a publisher's comic week
 *     description: |
 *       Returns fully detailed comics for a publisher's release week (the Monday
 *       containing the requested date). Weeks are snapshotted in a local cache
 *       after the first build; past weeks are served frozen without re-querying
 *       League of Comic Geeks, while the current week is diffed against a cheap
 *       releases-list check and only stale or degraded comics are re-fetched.
 *     tags:
 *       - Comics
 *     parameters:
 *       - in: query
 *         name: publisher
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Any date inside the requested week (YYYY-MM-DD format). Defaults to the current date.
 *     responses:
 *       200:
 *         description: Successfully retrieved the comic week
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publisher:
 *                   type: string
 *                   description: The publisher ID that was requested
 *                 week:
 *                   type: string
 *                   format: date
 *                   description: The Monday anchor date of the week (YYYY-MM-DD)
 *                 cache:
 *                   type: string
 *                   enum: [frozen, hit, miss]
 *                   description: |
 *                     frozen - immutable past-week snapshot served from cache;
 *                     hit - current week rebuilt from cache with diff/heal;
 *                     miss - current week built fresh
 *                 comics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ComicDetails'
 *       400:
 *         description: Bad request - missing publisher query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
weekRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { publisher, date } = req.query;
    if (!publisher || typeof publisher !== "string") {
      return res.status(400).json({ error: "publisher query parameter is required" });
    }
    const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getCurrentDate();

    const anchor = weekAnchor(dateStr);
    const live = anchor === weekAnchor(getCurrentDate());
    const cached = getWeek(publisher, anchor);

    // Frozen weeks (any past week): serve the immutable snapshot, never re-query.
    if (cached && !live) {
      return res.json({ publisher, week: anchor, cache: "frozen", comics: cached.comics });
    }

    // Cheap, CF-safe overview list is always checked for the requested week.
    const params: Record<string, string | string[]> = { "publisher[]": [publisher] };
    if (!live) params.date = anchor;
    const list = dedupeComics(extractComicData((await getComics(params)).list));

    let comics: ComicDetails[];

    if (!cached) {
      comics = collectSuccessful(
        await fetchComicDetailsFor(list.map(toDetailRequest))
      );
    } else {
      const listState = new Map(list.map((c) => [String(c.id), listStateKey(c)]));
      const cachedState = new Map(cached.comics.map((c) => [String(c.id), detailStateKey(c)]));
      const stale = list.filter((c) => listState.get(String(c.id)) !== cachedState.get(String(c.id)));
      const healable = new Set(cached.degradedIds.filter((id) => listState.has(id)));
      const heal = list.filter(
        (c) => healable.has(String(c.id)) && !stale.some((s) => s.id === c.id)
      );
      const work = [...stale, ...heal];
      const fetched =
        work.length > 0
          ? collectSuccessful(await fetchComicDetailsFor(work.map(toDetailRequest)))
          : [];
      const fetchedIds = new Set(fetched.map((c) => String(c.id)));
      comics = [
        ...cached.comics.filter(
          (c) =>
            listState.has(String(c.id)) &&
            listState.get(String(c.id)) === cachedState.get(String(c.id)) &&
            !fetchedIds.has(String(c.id))
        ),
        ...fetched,
      ];
    }

    upsertWeek(publisher, anchor, comics);
    res.json({ publisher, week: anchor, cache: cached ? "hit" : "miss", comics });
  } catch (error) {
    console.error("Error building comic week:", error);
    res.status(500).json({
      error: "Failed to build comic week",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function normalizeDate(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d);
}

function listStateKey(c: ComicData): string {
  return `${c.title}|${normalizeDate(c.date)}|${c.price}`;
}

function detailStateKey(c: ComicDetails): string {
  return `${c.title}|${normalizeDate(c.releaseDate)}|${c.price}`;
}

function toDetailRequest(c: ComicData): ComicRequest {
  return {
    comicId: c.parentId ?? c.id,
    title: c.titlePath,
    variantId: c.variantId !== undefined ? String(c.variantId) : undefined,
  };
}

function collectSuccessful(results: Awaited<ReturnType<typeof fetchComicDetailsFor>>): ComicDetails[] {
  return results.filter((r): r is ComicDetails => !("error" in r));
}
