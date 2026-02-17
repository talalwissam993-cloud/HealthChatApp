import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String, // We will generate this by combining two User IDs
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    text: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    }
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);