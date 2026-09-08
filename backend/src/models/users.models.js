import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        clerkUserId: {
            type: String,
            required: [true, "Clerk User ID is required"],
            unique: true,
            index: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        avatarUrl:{
            type: String,
            required: [true, "Avatar URL is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        dailyTargetMl: {
            type: Number,
            required: true,
            default: 2000,
            min: [1, "Daily target must be at least 1 ml"],
        },
        timezone: {
            type: String,
            required: true,
            default: "IST",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", userSchema);

