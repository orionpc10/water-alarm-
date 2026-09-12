import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { errorHandler } from "./src/middlewares/error.middlewares.js";

// Routes
import webhooksRouter from "./src/routes/webhooks.routes.js";
import usersRouter from "./src/routes/users.routes.js";
import healthCheckRouter from "./src/routes/healthCheck.routes.js";

const app = express();

// 1. Mount Webhooks BEFORE global body parsers to preserve raw body for signature verification
app.use("/api/webhooks", webhooksRouter);

// 2. Global body parsers for standard application routes
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// 3. Clerk authentication middleware (adds auth state to req)
app.use(clerkMiddleware());

// 4. Mount application routes
app.use("/api/users", usersRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/healthcheck", healthCheckRouter);

// 5. Global error handling middleware
app.use(errorHandler);

export { app };
