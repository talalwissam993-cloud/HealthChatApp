import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import cloudinary from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";
import { FriendRequest } from '../models/FriendRequestChema.js'

export const sendFriendRequest = catchAsyncErrors(async (req, res, next) => {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId) {
        return next(new ErrorHandler("You cannot add yourself!", 400));
    }

    // Check if a request already exists
    const existingRequest = await FriendRequest.findOne({
        $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId }
        ]
    });

    if (existingRequest) {
        return next(new ErrorHandler("Request already exists or you are already friends!", 400));
    }

    await FriendRequest.create({ sender: senderId, receiver: receiverId });

    res.status(200).json({ success: true, message: "Friend Request Sent!" });
});

export const respondToRequest = catchAsyncErrors(async (req, res, next) => {
    const { requestId, status } = req.body; // status: "accepted" or "rejected"

    const request = await FriendRequest.findById(requestId);
    if (!request) return next(new ErrorHandler("Request not found", 404));

    if (status === "accepted") {
        // Logic to add to each other's friend lists in User model
        await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
        await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

        request.status = "accepted";
        await request.save();
    } else {
        await request.deleteOne(); // Or set to 'rejected'
    }

    res.status(200).json({ success: true, message: `Request ${status}` });
});
export const getFriendRequests = catchAsyncErrors(async (req, res, next) => {
    // We look for requests where the logged-in user is the RECEIVER
    // and the status is still 'pending'
    const requests = await FriendRequest.find({
        receiver: req.user._id,
        status: "pending"
    }).populate("sender", "firstName lastName role docAvatar assignedHospital");

    res.status(200).json({
        success: true,
        requests,
    });
});