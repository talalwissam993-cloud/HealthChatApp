import mongoose from "mongoose";

export const dbConnection = () => {
    mongoose
        .connect(process.env.MONGO_URI, {
            dbName: "HealthChat",
            // Add these for better stability on Render
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
        })
        .then(() => {
            console.log("🚀 Health Chat: Database Connected Successfully!");
        })
        .catch((err) => {
            console.log("❌ Database Connection Error:", err.message);
            // Don't kill the process, just let the health check fail 
            // so Render tries to restart the container.
        });
};
