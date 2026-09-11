import mongoose, { Schema } from "mongoose";

const analyticsSummarySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
        },

        date: {
            type: Date,
            required: [true, "Date is required"],
        },

        targetMl: {
            type: Number,
            required: [true, "Daily target snapshot (targetMl) is required"],
            min: [1, "Target must be at least 1 ml"],
        },

        totalIntakeMl: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Total intake cannot be negative"],
        },

        targetAchieved: {
            type: Boolean,
            required: true,
            default: false,
        },

        completionPercentage: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Completion percentage cannot be negative"],
        },
    },
    {
        timestamps: true,
    }
);

// One summary per user per day
analyticsSummarySchema.index(
    { userId: 1, date: 1 },
    { unique: true }
);

export const AnalyticsSummary = mongoose.model(
    "AnalyticsSummary",
    analyticsSummarySchema
);