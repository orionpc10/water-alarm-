import mongoose from "mongoose";
import { User } from "../models/users.models.js";
import { WaterLog } from "../models/waterLogs.models.js";
import { ReminderSchedule } from "../models/reminderSchedules.models.js";
import { PushToken } from "../models/pushTokens.models.js";
import { AnalyticsSummary } from "../models/analyticsSummaries.models.js";
import { apiError } from "../utils/apiError.js";

/**
 * Allowed fields that clients are permitted to update via PATCH /api/users/me
 */
const ALLOWED_UPDATE_FIELDS = ["name", "avatarUrl", "dailyTargetMl", "timezone"];

/**
 * Retrieve a user document by Clerk User ID
 * @param {string} clerkUserId
 * @returns {Promise<Document>}
 */
export const getUserByClerkId = async (clerkUserId) => {
    if (!clerkUserId) {
        throw new apiError(400, "Clerk User ID is required");
    }

    const user = await User.findOne({ clerkUserId });
    if (!user) {
        throw new apiError(404, "User not found in database");
    }

    return user;
};

/**
 * Retrieve current authenticated user profile
 * @param {string} clerkUserId
 * @returns {Promise<Object>}
 */
export const getCurrentUser = async (clerkUserId) => {
    const user = await getUserByClerkId(clerkUserId);

    return {
        id: user._id,
        _id: user._id,
        clerkUserId: user.clerkUserId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        email: user.email,
        dailyTargetMl: user.dailyTargetMl,
        timezone: user.timezone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

/**
 * Update application-owned settings for the authenticated user
 * @param {string} clerkUserId
 * @param {Object} updateData
 * @returns {Promise<Document>}
 */
export const updateUserSettings = async (clerkUserId, updateData) => {
    if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
        throw new apiError(400, "Request body must be a valid JSON object");
    }

    const incomingKeys = Object.keys(updateData);

    if (incomingKeys.length === 0) {
        throw new apiError(400, "At least one setting must be provided for update");
    }

    // Reject disallowed or arbitrary fields (such as _id, clerkUserId, email, createdAt, updatedAt)
    const invalidKeys = incomingKeys.filter((key) => !ALLOWED_UPDATE_FIELDS.includes(key));
    if (invalidKeys.length > 0) {
        throw new apiError(
            400,
            `Modification of field(s) not allowed: ${invalidKeys.join(", ")}. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(", ")}`
        );
    }

    // Build update payload containing only permitted keys
    const updatePayload = {};
    for (const key of incomingKeys) {
        updatePayload[key] = updateData[key];
    }

    const updatedUser = await User.findOneAndUpdate(
        { clerkUserId },
        { $set: updatePayload },
        { returnDocument: "after", runValidators: true }
    );

    if (!updatedUser) {
        throw new apiError(404, "User not found in database");
    }

    return updatedUser;
};

/**
 * Safely delete user account and cascade deletion across all related entities:
 * WaterLog, ReminderSchedule, PushToken, AnalyticsSummary, and User
 * @param {string} clerkUserId
 * @returns {Promise<{ deleted: boolean, userId: ObjectId }>}
 */
export const deleteUserAccount = async (clerkUserId) => {
    const user = await User.findOne({ clerkUserId });
    if (!user) {
        throw new apiError(404, "User not found in database");
    }

    const userId = user._id;

    // Use MongoDB transaction if replica set is available, otherwise perform safe sequential cascade
    let session = null;
    try {
        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            await WaterLog.deleteMany({ userId }).session(session);
            await ReminderSchedule.deleteMany({ userId }).session(session);
            await PushToken.deleteMany({ userId }).session(session);
            await AnalyticsSummary.deleteMany({ userId }).session(session);
            await User.deleteOne({ _id: userId }).session(session);
        });
    } catch (err) {
        // Fallback for standalone MongoDB environments without replica set support
        if (
            err.message &&
            (err.message.includes("replica set") ||
                err.message.includes("Transaction numbers are only allowed"))
        ) {
            await WaterLog.deleteMany({ userId });
            await ReminderSchedule.deleteMany({ userId });
            await PushToken.deleteMany({ userId });
            await AnalyticsSummary.deleteMany({ userId });
            await User.deleteOne({ _id: userId });
        } else {
            throw err;
        }
    } finally {
        if (session) {
            await session.endSession();
        }
    }

    return {
        deleted: true,
        userId,
    };
};

/**
 * Create a new MongoDB user document from Clerk user.created webhook data
 * @param {Object} data Clerk user payload
 * @returns {Promise<Document>}
 */
export const createUserFromClerk = async (data) => {
    const clerkUserId = data?.id;
    if (!clerkUserId) {
        throw new apiError(400, "Clerk User ID is missing from webhook payload");
    }

    // Check for existing user with the same clerkUserId
    const existingUser = await User.findOne({ clerkUserId });
    if (existingUser) {
        throw new apiError(409, `User with Clerk ID ${clerkUserId} already exists in database`);
    }

    // Extract name
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
    const name = fullName || data.username || "User";

    // Extract primary email
    const primaryEmailId = data.primary_email_address_id;
    const emailObj =
        data.email_addresses?.find((e) => e.id === primaryEmailId) ||
        data.email_addresses?.[0];
    const email = emailObj?.email_address?.toLowerCase()?.trim();

    if (!email) {
        throw new apiError(400, "Valid email address is required from Clerk payload");
    }

    // Check if email conflicts with another user
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        throw new apiError(409, `User with email '${email}' already exists in database`);
    }

    // Extract avatarUrl
    const avatarUrl =
        data.image_url ||
        data.profile_image_url ||
        "https://img.clerk.com/preview";

    // Create user using model defaults for dailyTargetMl and timezone
    const newUser = await User.create({
        clerkUserId,
        name,
        email,
        avatarUrl,
    });

    return newUser;
};

/**
 * Update existing MongoDB user identity details from Clerk user.updated webhook data
 * @param {Object} data Clerk user payload
 * @returns {Promise<Document>}
 */
export const updateUserFromClerk = async (data) => {
    const clerkUserId = data?.id;
    if (!clerkUserId) {
        throw new apiError(400, "Clerk User ID is missing from webhook payload");
    }

    const user = await User.findOne({ clerkUserId });
    if (!user) {
        throw new apiError(404, `User with Clerk ID ${clerkUserId} not found in database`);
    }

    // Synchronize identity/profile fields from Clerk
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
    if (fullName) {
        user.name = fullName;
    } else if (data.username) {
        user.name = data.username;
    }

    if (data.image_url || data.profile_image_url) {
        user.avatarUrl = data.image_url || data.profile_image_url;
    }

    const primaryEmailId = data.primary_email_address_id;
    const emailObj =
        data.email_addresses?.find((e) => e.id === primaryEmailId) ||
        data.email_addresses?.[0];
    if (emailObj?.email_address) {
        user.email = emailObj.email_address.toLowerCase().trim();
    }

    // Save with Mongoose validation (preserves dailyTargetMl and timezone)
    await user.save();
    return user;
};

/**
 * Delete MongoDB user and cascade data from Clerk user.deleted webhook data
 * @param {Object} data Clerk user payload
 * @returns {Promise<Object>}
 */
export const deleteUserFromClerk = async (data) => {
    const clerkUserId = data?.id;
    if (!clerkUserId) {
        throw new apiError(400, "Clerk User ID is missing from webhook payload");
    }

    const user = await User.findOne({ clerkUserId });
    if (!user) {
        // Idempotent response: user already deleted or doesn't exist
        return { deleted: true, message: "User not found or already deleted" };
    }

    return await deleteUserAccount(clerkUserId);
};

/**
 * Dispatcher for Clerk webhook events
 * @param {Object} event Clerk webhook event object
 * @returns {Promise<Object>}
 */
export const syncUserFromClerk = async (event) => {
    if (!event || !event.type) {
        throw new apiError(400, "Invalid webhook event payload");
    }

    switch (event.type) {
        case "user.created":
            return await createUserFromClerk(event.data);
        case "user.updated":
            return await updateUserFromClerk(event.data);
        case "user.deleted":
            return await deleteUserFromClerk(event.data);
        default:
            return {
                ignored: true,
                message: `Unhandled event type: ${event.type}`,
            };
    }
};
