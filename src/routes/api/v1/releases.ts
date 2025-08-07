import { getComics } from "@/services";
import { Router } from "express";

export const releaseRouter = Router();

releaseRouter.get("/", (req, res) => {
  getComics()
    .then((data) => {
      res.json({
        version: "1.0.0",
        description: "Release API endpoint",
        status: "success",
        data,
      });
    })
    .catch((error) => {
      console.error("Error fetching comics:", error);
      res.status(500).json({
        version: "1.0.0",
        description: "Release API endpoint",
        status: "error",
        message: error.message,
      });
    });
});
