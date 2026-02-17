import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import cloudinary from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";
import crypto from "crypto";
import { sendEmailVerification } from "../utils/sendEmail.js";
import { FriendRequest } from '../models/FriendRequestChema.js'
import { Message } from "../models/messageSchema.js";

// Admin Controllers
export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
    console.log("Body Data:", req.body);
    console.log("File Data:", req.files);

    // 1. Validate Text Fields first
    const { firstName, middleName, lastName, email, phone, nic, dob, gender, password, docAvatar: avatarUrl } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
        return next(new ErrorHandler("Please Fill Full Form!", 400));
    }

    // 2. Handle Avatar Logic (File vs. URL)
    let avatarData = {
        public_id: "manual_upload",
        url: typeof avatarUrl === "string" ? avatarUrl : (avatarUrl?.url || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png")
    };

    // If a physical file IS provided via form-data, use Cloudinary
    if (req.files && req.files.docAvatar) {
        const cloudinaryResponse = await cloudinary.v2.uploader.upload(req.files.docAvatar.tempFilePath, {
            folder: "JO_HEALTH_ADMINS",
        });
        avatarData = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        };
    }

    // 3. Check existing user
    const isRegistered = await User.findOne({ $or: [{ email }, { phone }] });
    if (isRegistered) {
        return next(new ErrorHandler("User already exists!", 400));
    }

    // 4. Create Admin
    const admin = await User.create({
        firstName, middleName, lastName, email, phone, nic, dob, gender, password,
        role: "Admin",
        isVerified: true,
        docAvatar: avatarData,
    });

    res.status(200).json({
        success: true,
        message: "New Admin Registered Successfully!",
        admin,
    });
});
export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, phone, password, confirmPassword, role } = req.body;

    // ... (Keep your existing validation and find logic) ...

    const user = await User.findOne({
        $or: [{ email }, { phone }],
    }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid Email/Phone or Password!", 400));
    }

    // --- ADD THIS CHECK ---
    if (!user.isVerified) {
        return next(new ErrorHandler("Your account is not verified. Please check your email for the code!", 401));
    }
    // -----------------------

    // ... (Keep existing role and password matching) ...
    generateToken(user, "Welcome back to Health Chat!", 200, res);
});
export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
    });
});
export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
    res
        .status(201)
        .cookie("adminToken", "", {
            httpOnly: true,
            expires: new Date(Date.now()),
        })
        .json({
            success: true,
            message: "Admin Logged Out Successfully.",
        });
});
// ************************************************************************
// User Controller

export const addNewUser = catchAsyncErrors(async (req, res, next) => {
    const {
        firstName, middleName, lastName, email, phone, nic, dob, gender, password,
        role, doctorDepartment, nurseDepartment, chemistType, qualification,
        shift, assignedHospital
    } = req.body;

    // 1. Basic Field Validation
    if (!firstName || !lastName || !email || !phone || !nic || !dob || !gender || !password || !role) {
        return next(new ErrorHandler("Please Fill Full Form!", 400));
    }

    // 2. Avatar Presence Validation
    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandler("Avatar Required!", 400));
    }

    const { docAvatar } = req.files;
    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedFormats.includes(docAvatar.mimetype)) {
        return next(new ErrorHandler("File Format Not Supported!", 400));
    }

    // 3. Duplicate Check
    const isRegistered = await User.findOne({ $or: [{ email }, { nic }] });
    if (isRegistered) {
        return next(new ErrorHandler(`${role} with this Email or NIC already exists!`, 400));
    }

    // 4. Role-Specific Validation
    if (role === "Doctor" && !doctorDepartment) return next(new ErrorHandler("Doctor Department is required!", 400));
    if (role === "Nurse" && !nurseDepartment) return next(new ErrorHandler("Nurse Department is required!", 400));
    if (role === "Chemist" && !chemistType) return next(new ErrorHandler("Chemist Type is required!", 400));

    // 5. Cloudinary Upload
    const cloudinaryResponse = await cloudinary.v2.uploader.upload(
        docAvatar.tempFilePath,
        { folder: "HEALTH_CHAT_AVATARS" }
    );

    // --- NEW: VERIFICATION LOGIC ---
    // Generate 6-digit random code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    // 6. Create User (isVerified is now FALSE by default)
    const user = await User.create({
        firstName, middleName, lastName, email, phone, nic, dob, gender, password,
        role, doctorDepartment, nurseDepartment, chemistType, qualification,
        shift, assignedHospital,
        isVerified: false, // Changed from true
        verificationCode,
        verificationCodeExpire,
        docAvatar: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        },
    });

    // 7. Send the Email
    const message = `Welcome to Health Chat. Your verification code is: ${verificationCode}. It expires in 15 minutes.`;

    try {
        await sendEmailVerification({
            email: user.email,
            subject: "Verify Your Health Chat Account",
            code: verificationCode,
            message,
        });

        res.status(201).json({
            success: true,
            message: `Registration Successful! Verification code sent to ${user.email}`,
        });
    } catch (error) {
        // If email fails, we don't want a "broken" user in DB with no way to verify
        await User.findByIdAndDelete(user._id);
        return next(new ErrorHandler("Email could not be sent. Please try again.", 500));
    }
});

export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return next(new ErrorHandler("Email and Code are required!", 400));
    }

    const user = await User.findOne({
        email,
        verificationCode: code,
        verificationCodeExpire: { $gt: Date.now() },
    }).select("+verificationCode +verificationCodeExpire");

    if (!user) {
        return next(new ErrorHandler("Invalid or expired verification code!", 400));
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: "Account verified successfully! You can now login.",
    });
});

export const resendOTP = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ErrorHandler("Email is required!", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }

    if (user.isVerified) {
        return next(new ErrorHandler("Account is already verified!", 400));
    }
    if (user.otpResendCount >= 3 && user.lastOtpResend > Date.now() - 60 * 60 * 1000) {
        return next(new ErrorHandler("Too many attempts. Try again in an hour.", 429));
    }
    user.otpResendCount = (user.otpResendCount || 0) + 1;
    user.lastOtpResend = Date.now();

    // Generate new 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpire = Date.now() + 15 * 60 * 1000; // 15 mins

    // Update user with new code
    user.verificationCode = verificationCode;
    user.verificationCodeExpire = verificationCodeExpire;
    await user.save();

    // Send Email
    try {
        await sendEmailVerification({
            email: user.email,
            subject: "HealthChat | New Verification Code",
            code: verificationCode,
        });

        res.status(200).json({
            success: true,
            message: "A new verification code has been sent to your email!",
        });
    } catch (error) {
        return next(new ErrorHandler("Failed to send email. Try again.", 500));
    }
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    // 1. Fetch user (select password in case they want to change it)
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }

    // 2. Extract updates
    const {
        firstName, middleName, lastName, phone, dob,
        gender, bio, doctorDepartment, nurseDepartment,
        chemistType, qualification, shift, emergencyContact,
        assignedHospital, isOnDuty, password
    } = req.body;

    // 3. Update core info
    user.firstName = firstName || user.firstName;
    user.middleName = middleName || user.middleName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;
    user.dob = dob || user.dob;
    user.gender = gender || user.gender;
    user.bio = bio || user.bio;
    user.qualification = qualification || user.qualification;
    user.emergencyContact = emergencyContact || user.emergencyContact;
    user.assignedHospital = assignedHospital || user.assignedHospital;
    user.isOnDuty = isOnDuty !== undefined ? isOnDuty : user.isOnDuty;

    // 4. Role-specific logic
    if (user.role === "Doctor") user.doctorDepartment = doctorDepartment || user.doctorDepartment;
    if (user.role === "Nurse") user.nurseDepartment = nurseDepartment || user.nurseDepartment;
    if (user.role === "Chemist") user.chemistType = chemistType || user.chemistType;
    if (user.role !== "Patient") user.shift = shift || user.shift;

    // 5. Update Password (Middleware hashes this automatically)
    if (password) {
        user.password = password;
    }

    // 6. Handle Avatar via Cloudinary
    if (req.files && req.files.docAvatar) {
        const file = req.files.docAvatar;
        if (user.docAvatar && user.docAvatar.public_id) {
            await cloudinary.v2.uploader.destroy(user.docAvatar.public_id);
        }
        const myCloud = await cloudinary.v2.uploader.upload(file.tempFilePath, {
            folder: "HEALTH_CHAT_AVATARS",
        });
        user.docAvatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
        };
    }

    // Trigger .save() to run schema pre-save hooks
    await user.save();

    res.status(200).json({
        success: true,
        message: "Profile Updated Successfully!",
        user,
    });
});

export const getAllUsersByRole = catchAsyncErrors(async (req, res, next) => {
    const { role } = req.query;

    // If a role is provided (e.g., ?role=Doctor), filter by it. 
    // Otherwise, get everyone EXCEPT Admins for security/privacy.
    const filter = role ? { role } : { role: { $ne: "Admin" } };

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: users.length,
        users,
    });
});

export const searchUsers = catchAsyncErrors(async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(200).json({ success: true, users: [] });
    }

    const searchRegex = { $regex: query, $options: "i" };

    const users = await User.find({
        $and: [
            { _id: { $ne: req.user._id } }, // Exclude current user
            {
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { phone: searchRegex },           // Added phone search
                    { nic: searchRegex },             // Changed to regex for partial NIC
                    { doctorLicenseNumber: searchRegex },
                    { nurseLicenseNumber: searchRegex },
                    { chemistLicenseNumber: searchRegex },
                    { patientID: searchRegex }
                ]
            }
        ]
    }).select("firstName lastName role docAvatar assignedHospital isOnDuty"); // Added isOnDuty for the chat UI

    res.status(200).json({ success: true, users });
});
// *****************************************************************
export const getAllDoctors = async (req, res, next) => {
    const doctors = await User.find({ role: "Doctor" }); // Fetching the variable

    res.status(200).json({
        success: true,
        doctors, // The frontend will loop through this variable to show cards
    });
};
export const getAllNurse = async (req, res, next) => {
    const doctors = await User.find({ role: "Nurse" }); // Fetching the variable

    res.status(200).json({
        success: true,
        doctors, // The frontend will loop through this variable to show cards
    });
};
export const getAllChemist = async (req, res, next) => {
    const doctors = await User.find({ role: "Chemist" }); // Fetching the variable

    res.status(200).json({
        success: true,
        doctors, // The frontend will loop through this variable to show cards
    });
};
export const getAllPatient = async (req, res, next) => {
    const doctors = await User.find({ role: "Patient" }); // Fetching the variable

    res.status(200).json({
        success: true,
        doctors, // The frontend will loop through this variable to show cards
    });
};
// *****************************************************************

// Friends Request
export const sendFriendRequest = catchAsyncErrors(async (req, res, next) => {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId) {
        return next(new ErrorHandler("You cannot add yourself!", 400));
    }
    const receiver = await User.findById(receiverId);
    if (req.user.role === "Patient" && receiver.role === "Patient") {
        return next(new ErrorHandler("Patients cannot add other patients.", 403));
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

export const getFriendRequests = async (req, res) => {
    // Finds pending requests where the current user is the receiver
    // Populates the sender's medical details for the Health Chat UI
    const requests = await FriendRequest.find({
        receiver: req.user._id,
        status: "pending"
    }).populate("sender", "firstName lastName role docAvatar doctorDepartment assignedHospital");

    res.status(200).json({
        success: true,
        requests
    });
};

// is OnDuty
export const toggleDutyStatus = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    // Toggle the boolean
    user.isOnDuty = !user.isOnDuty;
    user.lastStatusUpdate = Date.now();

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        message: `You are now ${user.isOnDuty ? "On Duty" : "Off Duty"}`,
        isOnDuty: user.isOnDuty,
    });
});

export const updatePushToken = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return next(new ErrorHandler("Token is required", 400));
    }

    // Find user and update their push token
    await User.findByIdAndUpdate(req.user._id, { pushToken: token });

    res.status(200).json({
        success: true,
        message: "Push Token Updated Successfully",
    });
});

export const getMyChatList = catchAsyncErrors(async (req, res) => {
    const user = await User.findById(req.user._id).populate("friends", "firstName lastName docAvatar role isOnDuty");

    // For each friend, find the most recent message in the DB
    const chatList = await Promise.all(user.friends.map(async (friend) => {
        const conversationId = [req.user._id.toString(), friend._id.toString()].sort().join("_");
        const lastMsg = await Message.findOne({ conversationId }).sort({ createdAt: -1 });

        return {
            friend,
            lastMessage: lastMsg ? lastMsg.text : "No messages yet",
            lastMessageTime: lastMsg ? lastMsg.createdAt : null
        };
    }));

    res.status(200).json({ success: true, chatList });
});

