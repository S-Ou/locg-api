import { getComics } from "@/services";
import { extractComicData } from "@/utils/htmlParser";
import { Router } from "express";

export const releaseRouter = Router();

releaseRouter.get("/", async (req, res) => {
  const data = await getComics();
  const comics = extractComicData(data.list);
  res.json(comics);
});
