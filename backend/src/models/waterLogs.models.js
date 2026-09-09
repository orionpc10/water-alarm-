import mongoose, { Schema } from "mongoose";

const waterLogSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },
        amountMl: {
            type: Number,
            required: [true, "Water amount in ml is required"],
            min: [1, "Single intake amount must be at least 1 ml"],
            max: [10000, "Single intake amount cannot exceed 10,000 ml"]
        },
        timestamp: {
            type: Date,
            required: [true, "Log timestamp is required"],
            default: Date.now,
        },
        source: {
            type: String,
            enum: {
                values: ["manual", "quickAdd", "widget", "voice"],
                message: "{VALUE} is not a valid logging source",
            },
            default: "manual",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for querying user logs sorted by time (e.g., today's logs, daily aggregations)
waterLogSchema.index({ userId: 1, timestamp: -1 });

export const WaterLog = mongoose.model("WaterLog", waterLogSchema);

