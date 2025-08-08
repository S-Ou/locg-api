import { Router } from "express";
import { releaseRouter } from "./releases";
import { detailsRouter } from "./details";

export const comicRouter = Router();

comicRouter.use("/releases", releaseRouter);
comicRouter.use("/details", detailsRouter);
