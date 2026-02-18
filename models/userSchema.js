import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Counter } from './CounterModel.js'

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: [true, "First Name Is Required!"], minLength: [3, "Min 3 chars"] },
    middleName: { type: String, required: [true, "Middle Name Is Required!"], minLength: [3, "Min 3 chars"] },
    lastName: { type: String, required: [true, "Last Name Is Required!"], minLength: [3, "Min 3 chars"] },
    email: { type: String, required: [true, "Email Required!"], validate: [validator.isEmail, "Valid Email!"], unique: true },
    phone: { type: String, required: [true, "Phone Required!"], unique: true },
    nic: {
        type: String,
        required: [true, "NIC Required!"],
        unique: true,
        match: [/^\d{10}$/, "Jordanian NIC must be exactly 10 digits"]
    },
    dob: { type: Date, required: [true, "DOB Required!"] },
    gender: { type: String, required: [true, "Gender Required!"], enum: ["Male", "Female"] },
    password: { type: String, required: [true, "Password Required!"], minLength: [8, "Min 8 chars"], select: false },
    role: {
        type: String,
        required: [true, "Role Required!"],
        enum: ["Patient", "Doctor", "Admin", "Nurse", "Chemist"]
    },

    // Verification Logic
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    verificationCodeExpire: { type: Date, select: false },

    doctorLicenseNumber: {
        type: String,
        sparse: true,
        trim: true,
        unique: true,
        match: [/^911-\d{4}$/, 'Please use the format 911-XXXX']
    },
    nurseLicenseNumber: {
        type: String,
        sparse: true,
        trim: true,
        unique: true,
        match: [/^922-\d{4}$/, 'Please use the format 922-XXXX']
    },
    chemistLicenseNumber: {
        type: String,
        sparse: true,
        trim: true,
        unique: true,
        match: [/^933-\d{4}$/, 'Please use the format 933-XXXX']
    },
    patientID: {
        type: String,
        unique: true,
        sparse: true, // Add this to allow non-patients to exist without an ID
        match: [/^944-\d{4}$/, 'Please use the format 944-XXXX']
    },
    // Specialized Departments
    doctorDepartment: {
        type: String,
        enum: ["Pediatrics", "Orthopedics", "Cardiology", "Neurology", "Oncology", "Radiology", "General"]
    },
    nurseDepartment: {
        type: String,
        enum: [
            "Critical Care / ICU",
            "Emergency & Trauma",
            "Perioperative / Surgical Services",
            "Neonatal & Pediatric Intensive Care",
            "Oncology & Infusion",
            "Cardiology & Catheterization Lab",
            "Neurology & Stroke Unit",
            "Labor & Delivery / Obstetrics",
            "Psychiatric & Behavioral Health",
            "Dialysis & Nephrology",
            "Hospice & Palliative Care",
            "Telehealth & Triage",
        ],
        default: "Telehealth & Triage"
    },
    chemistType: {
        type: String,
        enum: [
            "Clinical Pharmacist",
            "Community Pharmacist",
            "Pharmacy Technician",
            "Pharmaceutical Researcher",
            "Pharmacologist",
            "Industrial Chemist",
            "Toxicologist",
            "Analytical Chemist"
        ]
    },

    qualification: String, // e.g., MBBS, Ph.D., B.Pharm
    shift: { type: String, enum: ["Morning", "Evening", "Night"] },

    emergencyContact: String,
    assignedHospital: String,

    docAvatar: { public_id: String, url: String },

    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    isOnDuty: {
        type: Boolean,
        default: false,
    },
    lastStatusUpdate: {
        type: Date,
        default: Date.now
    },
    pushToken: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        trim: true,
        maxLength: [500, "Bio cannot exceed 1000 characters"],
        default: "Hey there! I'm using Health Chat."
    },

}, { timestamps: true }); // Automatically adds createdAt and updatedAt

// --- 1. ENCRYPTION MIDDLEWARE ---
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
});

// --- 2. INSTANCE METHODS ---
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateJsonWebToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRES || "7d",
    });
};

// --- AUTO-GENERATE CUSTOM ID MIDDLEWARE ---
userSchema.pre("save", async function (next) {
    // Only run this logic if the document is new
    if (!this.isNew) return next();

    const roleMap = {
        "Doctor": { prefix: "911", field: "doctorLicenseNumber" },
        "Nurse": { prefix: "922", field: "nurseLicenseNumber" },
        "Chemist": { prefix: "933", field: "chemistLicenseNumber" },
        "Patient": { prefix: "944", field: "patientID" }
    };

    const roleConfig = roleMap[this.role];

    // Skip if role doesn't need an auto-ID (like Admin)
    if (!roleConfig) return next();

    try {
        // Find and increment the counter for this specific role
        const counter = await Counter.findOneAndUpdate(
            { id: this.role },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        // Format: Prefix + "-" + 4-digit sequence (e.g., 911-0001)
        const sequenceNumber = counter.seq.toString().padStart(4, "0");
        this[roleConfig.field] = `${roleConfig.prefix}-${sequenceNumber}`;

        next();
    } catch (error) {
        next(error);
    }
});
// Add this to your User Schema file
userSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 86400, // 24 hours
    partialFilterExpression: { isVerified: false }
});

export const User = mongoose.model("User", userSchema);
