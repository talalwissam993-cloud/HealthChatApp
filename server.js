import app from "./app.js";
import cloudinary from "cloudinary";
import { Server } from "socket.io";
import http from "http";
import { Message } from "./models/messageSchema.js"; // Import the model we discussed
import axios from "axios"; // Add this line at the top!

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 1. Create HTTP Server (Required for Socket.io)
const server = http.createServer(app);

// 2. Initialize Socket.io with CORS for your Expo App/Web
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust this to your specific frontend URL later for security
        methods: ["GET", "POST"],
    },
});

// 3. Real-time Chat Logic with DB Storage
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_chat", (data) => {
        const { userId, friendId } = data;
        const room = [userId, friendId].sort().join("_");
        socket.join(room);
        console.log(`User joined room: ${room}`);

        socket.on("message_seen", async ({ conversationId }) => {
            await Message.updateMany(
                { conversationId, status: "sent" },
                { $set: { status: "read" } }
            );
            io.to(conversationId).emit("status_updated", { status: "read" });
        });
    });

    socket.on("send_message", async (data) => {
        try {
            const { sender, receiver, text } = data;
            const conversationId = [sender, receiver].sort().join("_");

            const newMessage = await Message.create({
                conversationId,
                sender,
                receiver,
                text,
                status: "sent" // Ensure default status
            });

            // 1. Send to the receiver
            socket.to(conversationId).emit("receive_message", newMessage);

            // 2. Send back to the sender as a 'confirmation'
            socket.emit("message_delivered", { tempId: data.tempId, permanentId: newMessage._id });
        } catch (error) {
            socket.emit("message_error", { message: "Failed to deliver" });
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// A simple ping to the base URL or a health route is enough
const keepAlive = (url) => {
    setInterval(async () => {
        try {
            // Ping the root or a dedicated health endpoint
            await axios.get(url);
            console.log("🚀 Health Chat: Keeping the engine warm...");
        } catch (error) {
            // Even if it fails (e.g. 404), Render stays awake because there was a request
            console.log("🚀 Health Chat: Ping received (Server is active)");
        }
    }, 13 * 60 * 1000); // 13 minutes is safer than 14
};

// Use your base URL to ensure the server registers the hit
keepAlive("https://healthchatapp.onrender.com/");

const PORT = process.env.PORT || 8001;

// Use 'server.listen' instead of 'app.listen'
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});
