import mongoose from "mongoose";
import dns from "node:dns";
import { DB_NAME } from "../../constants.js";

const connectDB = async () => {
    try {
        const dnsServers = process.env.MONGODB_DNS_SERVERS
            ?.split(",")
            .map((server) => server.trim())
            .filter(Boolean);

        if (dnsServers?.length) {
            dns.setServers(dnsServers);
        }

        const mongoUri = new URL(process.env.MONGODB_URI);
        mongoUri.pathname = `/${DB_NAME}`;
        await mongoose.connect(mongoUri.toString());
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

export default connectDB;