import express from "express";
import {
    addNewAdmin,
    login,
    getUserDetails,
    logoutAdmin,
    addNewUser,
    verifyOTP,
    resendOTP,
    updateProfile,
    getAllUsersByRole
} from "../controllers/userController.js";
import {
    // ... your existing imports
    sendFriendRequest,
    getFriendRequests,
    respondToRequest,
    toggleDutyStatus,
    updatePushToken
} from "../controllers/userController.js";

import {
    isAdminAuthenticated,
    isAuthenticated,
} from "../middlewares/auth.js";
import { Message } from '../models/messageSchema.js'

const router = express.Router();

// --- AUTH ROUTES ---
router.post("/login", login);
router.get("/me", isAdminAuthenticated, getUserDetails);

// --- ADMIN ROUTES ---
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin);
router.get("/admin/logout", isAdminAuthenticated, logoutAdmin);

// --- USER MANAGEMENT ---
// Note: Only authenticated admins should be able to register new doctors/nurses
router.post("/register", isAdminAuthenticated, addNewUser);
router.put("/profile/update", isAuthenticated, updateProfile);
router.get("/admin/all-users", isAdminAuthenticated, getAllUsersByRole);

// --- NEW: VERIFICATION ROUTE ---
// This is called when the user enters the 6-digit code from their email
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Friends Request
router.post("/friend/request/send", isAuthenticated, sendFriendRequest);

// 2. Get all pending requests for the logged-in user
router.get("/friend/requests/pending", isAuthenticated, getFriendRequests);

// 3. Accept or Reject a specific request
router.put("/friend/request/respond", isAuthenticated, respondToRequest);

router.put("/me/toggle-duty", isAuthenticated, toggleDutyStatus);

router.put("/user/update-push-token", isAuthenticated, updatePushToken);

// Get chat history between two users
router.get("/chat/history/:friendId", isAuthenticated, async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20; // Load 20 at a time for smooth scrolling in Expo
    const skip = (page - 1) * limit;

    const conversationId = [userId.toString(), friendId].sort().join("_");

    const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 }) // Get newest first for pagination
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        messages: messages.reverse() // Reverse back so they appear in order
    });
});
export default router;