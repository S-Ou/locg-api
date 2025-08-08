import { Router } from "express";
import { comicRouter } from "./comic";

export const apiV1Router = Router();
apiV1Router.use("/comic", comicRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
apiV1Router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
