users [icon: user, color: blue] {
  id ObjectId pk                    // Mongo _id, auto-generated
  clerkUserId string                // unique: true, index: true — used for auth lookup
  name string                       // required: true
  email string                      // unique: true, required: true, lowercase: true
  dailyTargetMl int                 // required: true, default: 2000
  timezone string                   // required: true, default: "UTC" — IANA tz string e.g. "Asia/Kolkata"
  createdAt datetime                // auto via timestamps: true
  updatedAt datetime                // auto via timestamps: true
}

waterLogs [icon: droplet, color: lightblue] {
  id ObjectId pk                    // Mongo _id
  userId ObjectId                   // ref: "User", required: true, index: true (compound with timestamp below)
  amountMl int                      // required: true, min: 1
  timestamp datetime                // required: true, index: true — actual time water was logged (can be backdated)
  source string                     // enum: ["manual", "quickAdd", "widget", "voice"], default: "manual"
  createdAt datetime                // auto via timestamps: true — when the doc was actually inserted
  updatedAt datetime                // auto via timestamps: true
  // compound index: { userId: 1, timestamp: -1 } for "today's logs" queries
}

reminderSchedules [icon: clock, color: orange] {
  id ObjectId pk                    // Mongo _id
  userId ObjectId                   // ref: "User", required: true, index: true
  title string                      // required: true, default: "Drink water"
  reminderType string                // enum: ["interval", "fixed"], required: true — discriminates which fields below apply
  startTime string                  // used only when reminderType === "interval"; "HH:mm" 24h format
  endTime string                    // used only when reminderType === "interval"; "HH:mm" 24h format
  intervalMinutes int                // used only when reminderType === "interval"; min: 15
  reminderTimes [string]             // used only when reminderType === "fixed"; array of "HH:mm" strings
  isEnabled boolean                  // default: true, index: true — for cron job filtering active reminders
  createdAt datetime                // auto via timestamps: true
  updatedAt datetime                // auto via timestamps: true
  // compound index: { isEnabled: 1, userId: 1 } for the notification-firing cron job
}

pushTokens [icon: bell, color: purple] {
  id ObjectId pk                    // Mongo _id
  userId ObjectId                   // ref: "User", required: true, index: true
  expoPushToken string               // required: true
  platform string                   // enum: ["ios", "android"], required: true (lowercase to avoid typos)
  deviceId string                   // required: true — used to dedupe re-installs/re-logins
  createdAt datetime                // add this — auto via timestamps: true, useful for stale-token cleanup
  updatedAt datetime                // auto via timestamps: true
  // compound unique index: { userId: 1, deviceId: 1 } — prevents duplicate token rows per device
}

analyticsSummaries [icon: activity, color: green] {
  id ObjectId pk                    // Mongo _id
  userId ObjectId                   // ref: "User", required: true, index: true
  date date                         // required: true — store as UTC midnight per user's timezone-normalized day
  targetMl int                      // snapshot of dailyTargetMl at time of computation (don't re-read from users)
  totalIntakeMl int                 // required: true, default: 0 — aggregated from waterLogs
  targetAchieved boolean            // derived: totalIntakeMl >= targetMl
  completionPercentage float        // derived: (totalIntakeMl / targetMl) * 100
  // compound unique index: { userId: 1, date: 1 } — prevents duplicate summary rows per day
}

users.id < waterLogs.userId
users.id < reminderSchedules.userId
users.id < pushTokens.userId
users.id < analyticsSummaries.userId 