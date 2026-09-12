import express, { Router } from "express";
import { handleClerkWebhook } from "../controllers/users.controllers.js";

const router = Router();

/**
 * POST /api/webhooks/clerk
 * Receives raw body payload for cryptographic signature verification via Svix / Clerk
 */
router.post(
    "/clerk",
    express.raw({ type: "application/json" }),
    handleClerkWebhook
);

export default router;

