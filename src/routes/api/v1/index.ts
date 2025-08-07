import { Router } from "express";
import { releaseRouter } from "./releases";

export const apiV1Router = Router();
apiV1Router.use("/releases", releaseRouter);

apiV1Router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
