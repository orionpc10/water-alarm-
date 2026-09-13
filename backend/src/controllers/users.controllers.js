import { verifyWebhook } from "@clerk/express/webhooks";
import * as usersService from "../services/users.services.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /api/users/me
 * Retrieve the currently authenticated user's profile and settings.
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    // Authenticated user ID is sourced exclusively from verified Clerk session
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
        throw new apiError(401, "Unauthorized: No valid Clerk session found");
    }

    const userProfile = await usersService.getCurrentUser(clerkUserId);

    return res
        .status(200)
        .json(new apiResponse(200, userProfile, "User profile retrieved successfully"));
});

/**
 * PATCH /api/users/me
 * Update application-owned settings for the authenticated user.
 */
export const updateUserSettings = asyncHandler(async (req, res) => {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
        throw new apiError(401, "Unauthorized: No valid Clerk session found");
    }

    const updatedUser = await usersService.updateUserSettings(clerkUserId, req.body);

    return res
        .status(200)
        .json(new apiResponse(200, updatedUser, "User settings updated successfully"));
});

/**
 * DELETE /api/users/me
 * Delete the authenticated user's account and cascade deletion to all related data.
 */
export const deleteUserAccount = asyncHandler(async (req, res) => {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
        throw new apiError(401, "Unauthorized: No valid Clerk session found");
    }

    const result = await usersService.deleteUserAccount(clerkUserId);

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                result,
                "User account and all related application data deleted successfully"
            )
        );
});

/**
 * POST /api/webhooks/clerk
 * Handle incoming Clerk webhook events after verifying cryptographic signature.
 */

export const handleClerkWebhook = asyncHandler(async (req, res) => {
    const signingSecret =
        process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
        process.env.CLERK_WEBHOOK_SECRET;

    // console.log("\n========== CLERK WEBHOOK ==========");
    // console.log("Headers:", req.headers);
    // console.log("Body is Buffer:", Buffer.isBuffer(req.body));
    // console.log("Body length:", req.body?.length);
    // console.log("Signing secret exists:", !!signingSecret);
    // console.log("Signing secret prefix:", signingSecret?.substring(0, 6));

    if (!signingSecret) {
        throw new apiError(
            500,
            "Clerk webhook signing secret is not configured"
        );
    }

    let evt;

    try {
        evt = await verifyWebhook(req, { signingSecret });

        // console.log("Verification SUCCESS");
        // console.log("Event type:", evt.type);
        // console.log("Event user ID:", evt.data?.id);

    } catch (err) {
        console.error("Verification FAILED");
        console.error(err);

        throw new apiError(
            400,
            `Clerk webhook signature verification failed: ${err.message}`
        );
    }

    const result = await usersService.syncUserFromClerk(evt);

    return res.status(200).json(
        new apiResponse(
            200,
            result,
            `Webhook '${evt.type}' processed successfully`
        )
    );
});