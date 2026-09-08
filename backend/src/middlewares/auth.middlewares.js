import { getAuth } from "@clerk/express";
import { User } from "../models/users.models.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to protect routes and attach both Clerk auth state and
 * the MongoDB User document to the request object.
 */
export const verifyClerkAuth = asyncHandler(async (req, _, next) => {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
        throw new apiError(401, "Unauthorized: Authentication token is missing or invalid");
    }

    const user = await User.findOne({ clerkUserId: auth.userId });

    if (!user) {
        throw new apiError(
            404,
            "User not found in database. Please ensure your user profile is registered or synced."
        );
    }

    // Attach both the authenticated MongoDB user and Clerk auth state
    req.user = user;
    req.auth = auth;

    next();
});

/**
 * Optional authentication middleware.
 * Attaches user to req.user if a valid Clerk session exists, but doesn't block unauthenticated requests.
 */
export const optionalAuth = asyncHandler(async (req, _, next) => {
    const auth = getAuth(req);

    if (auth?.userId) {
        const user = await User.findOne({ clerkUserId: auth.userId });
        if (user) {
            req.user = user;
        }
        req.auth = auth;
    }

    next();
});
