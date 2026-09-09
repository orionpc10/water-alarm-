import mongoose, { Schema } from "mongoose";

const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

//  Safely retrieves field values across Document (.save()) and Query (findOneAndUpdate) contexts.
//  Handles partial updates by falling back to existing document values where possible.

const getField = (context, fieldName) => {
    if (!context) return undefined;

    // 1. Document Context (e.g., doc.save())
    if (context[fieldName] !== undefined) {
        return context[fieldName];
    }

    // 2. Query Context (e.g., findOneAndUpdate)
    if (typeof context.getUpdate === "function") {
        const update = context.getUpdate();
        if (update) {
            if (update[fieldName] !== undefined) return update[fieldName];
            if (update.$set && update.$set[fieldName] !== undefined) {
                return update.$set[fieldName];
            }
        }
    }

    return undefined;
};

const reminderScheduleSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Reminder title is required"],
            default: "Drink water",
            trim: true,
        },
        reminderType: {
            type: String,
            required: [true, "Reminder type is required"],
            enum: {
                values: ["interval", "fixed"],
                message: "{VALUE} must be either 'interval' or 'fixed'",
            },
        },
        // Fields for reminderType === 'interval'
        startTime: {
            type: String,
            trim: true,
            validate: {
                validator: function (value) {
                    const reminderType = getField(this, "reminderType");
                    if (reminderType === "interval") {
                        return Boolean(value && timeFormatRegex.test(value));
                    }
                    return true;
                },
                message: "Start time is required for interval reminders and must be in HH:mm 24-hour format (e.g., '09:00')",
            },
        },
        endTime: {
            type: String,
            trim: true,
            validate: [
                {
                    validator: function (value) {
                        const reminderType = getField(this, "reminderType");
                        if (reminderType === "interval") {
                            return Boolean(value && timeFormatRegex.test(value));
                        }
                        return true;
                    },
                    message: "End time is required for interval reminders and must be in HH:mm 24-hour format (e.g., '21:00')",
                },
                {
                    validator: function (endTimeVal) {
                        const reminderType = getField(this, "reminderType");
                        if (reminderType === "interval" && endTimeVal) {
                            const startTimeVal = getField(this, "startTime");
                            
                            // Validate chronological order via native string comparison
                            if (startTimeVal && timeFormatRegex.test(startTimeVal) && timeFormatRegex.test(endTimeVal)) {
                                return startTimeVal < endTimeVal;
                            }
                        }
                        return true;
                    },
                    message: "End time must be strictly later than start time",
                },
            ],
        },
        intervalMinutes: {
            type: Number,
            validate: {
                validator: function (value) {
                    const reminderType = getField(this, "reminderType");
                    if (reminderType === "interval") {
                        return typeof value === "number" && value >= 15;
                    }
                    return true;
                },
                message: "Interval minutes is required for interval reminders and must be at least 15 minutes",
            },
        },
        // Field for reminderType === 'fixed'
        reminderTimes: {
            type: [String],
            validate: [
                {
                    validator: function (times) {
                        const reminderType = getField(this, "reminderType");
                        if (reminderType === "fixed") {
                            if (!Array.isArray(times) || times.length === 0) {
                                return false;
                            }
                            return times.every((time) => timeFormatRegex.test(time));
                        }
                        return true;
                    },
                    message: "Fixed reminders must include at least one valid time in HH:mm 24-hour format (e.g., ['09:00', '14:00'])",
                },
                {
                    validator: function (times) {
                        const reminderType = getField(this, "reminderType");
                        if (reminderType === "fixed" && Array.isArray(times) && times.length > 0) {
                            return new Set(times).size === times.length;
                        }
                        return true;
                    },
                    message: "Fixed reminder times must not contain duplicate times",
                },
            ],
        },
        isEnabled: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to quickly filter enabled reminders by user
reminderScheduleSchema.index({ isEnabled: 1, userId: 1 });

export const ReminderSchedule =
    mongoose.models.ReminderSchedule ||
    mongoose.model("ReminderSchedule", reminderScheduleSchema);