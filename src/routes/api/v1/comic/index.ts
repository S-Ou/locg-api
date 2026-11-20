import { Router } from "express";
import { releaseRouter } from "./releases";
import { detailsRouter } from "./details";
import { weekRouter } from "./week";

export const comicRouter = Router();

comicRouter.use("/releases", releaseRouter);
comicRouter.use("/details", detailsRouter);
comicRouter.use("/week", weekRouter);
