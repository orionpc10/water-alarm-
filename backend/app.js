import express from "express";

const app = express();

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

import { clerkMiddleware } from "@clerk/express";
import {errorHandler} from "./src/middlewares/error.middlewares.js"

// Clerk authentication middleware (adds auth state to req)
app.use(clerkMiddleware());

import healthCheckRouter from "./src/routes/healthCheck.routes.js"

app.use("/api/v1/healthcheck", healthCheckRouter)

app.use(errorHandler)

export {app};
