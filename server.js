import app from "./app.js";
import cloudinary from "cloudinary";
import { Server } from "socket.io";
import http from "http";
import { Message } from "./models/messageSchema.js"; // Import the model we discussed

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

            // SAVE TO DATABASE
            const newMessage = await Message.create({
                conversationId,
                sender,
                receiver,
                text,
            });

            // EMIT TO THE ROOM
            io.to(conversationId).emit("receive_message", newMessage);
        } catch (error) {
            console.error("Message error:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

const PORT = process.env.PORT || 8001;

// Use 'server.listen' instead of 'app.listen'
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});