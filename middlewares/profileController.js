import { Doctor } from "../models/doctorSchema.js";
import { Nurse } from "../models/nurseSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import cloudinary from "cloudinary";

export const createOrUpdateProfessionalProfile = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user._id;
    const role = req.user.role;

    if (!["Doctor", "Nurse"].includes(role)) {
        return next(new ErrorHandler("Only Doctors and Nurses can manage professional profiles!", 403));
    }

    const Model = role === "Doctor" ? Doctor : Nurse;
    let profile = await Model.findOne({ user: userId });

    const { licenseNumber, qualification, hospital, department, shift, cv } = req.body;
    const updateData = {
        user: userId,
        [`${role.toLowerCase()}LicenseNumber`]: licenseNumber,
        qualification,
        hospital,
        department,
        shift,
        cv: typeof cv === 'string' ? JSON.parse(cv) : cv // Handle JSON string if sent via FormData
    };

    // --- CLOUDINARY IMAGE LOGIC ---
    if (req.files && req.files.profileImage) {
        const file = req.files.profileImage;
        const allowedFormats = ["image/png", "image/jpeg", "image/webp"];

        if (!allowedFormats.includes(file.mimetype)) {
            return next(new ErrorHandler("File format not supported!", 400));
        }

        // Delete old image if it exists
        if (profile?.docAvatar?.public_id) {
            await cloudinary.v2.uploader.destroy(profile.docAvatar.public_id);
        }

        // Upload new image
        const cloudinaryResponse = await cloudinary.v2.uploader.upload(
            file.tempFilePath,
            { folder: `MEDICAL_STAFF_${role.toUpperCase()}` }
        );

        updateData.docAvatar = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        };
    }

    profile = await Model.findOneAndUpdate(
        { user: userId },
        updateData,
        { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: "Professional Profile Updated Successfully!",
        profile
    });
});