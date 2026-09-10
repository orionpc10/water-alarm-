import mongoose, { Schema } from "mongoose";

const pushTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },
        expoPushToken: {
            type: String,
            required: [true, "Expo push token is required"],
            trim: true,
            unique: true, 
            validate: {
                validator: function (token) {
                    return /^Expo(nent)?PushToken\[.+\]$/.test(token);
                },
                message:
                    "Invalid Expo push token format. Expected ExponentPushToken[...] or ExpoPushToken[...]",
            },
        },
        platform: {
            type: String,
            required: [true, "Platform is required"],
            enum: {
                values: ["ios", "android"],
                message: "{VALUE} is not a supported platform ('ios' or 'android')",
            },
            lowercase: true,
            trim: true,
        },
        deviceId: {
            type: String,
            required: [true, "Device ID is required"],
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true, 
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index: ensures only one active token document per device for a given user
pushTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const PushToken =
    mongoose.models.PushToken ||
    mongoose.model("PushToken", pushTokenSchema);