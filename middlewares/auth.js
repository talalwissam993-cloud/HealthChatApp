import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";

// 1. ADMIN AUTHENTICATION
export const isAdminAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) {
    return next(new ErrorHandler("Admin is not authenticated!", 400));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
  }
  next();
});
// 2. PATIENT AUTHENTICATION
export const isPatientAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.patientToken;
  if (!token) {
    return next(new ErrorHandler("Patient is not authenticated!", 400));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);
  if (req.user.role !== "Patient") {
    return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
  }
  next();
});
// 3. DOCTOR AUTHENTICATION
export const isDoctorAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.doctorToken;
  if (!token) {
    return next(new ErrorHandler("Doctor is not authenticated!", 400));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);
  if (req.user.role !== "Doctor") {
    return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
  }
  next();
});
// 4. CHEMIST AUTHENTICATION
export const isChemistAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.chemistToken;
  if (!token) {
    return next(new ErrorHandler("Chemist is not authenticated!", 400));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);
  if (req.user.role !== "Chemist") {
    return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
  }
  next();
});
// Middleware to authenticate Nurse users
export const isNurseAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.nurseToken;

  if (!token) {
    return next(
      new ErrorHandler("Nurse is not authenticated!", 400)
    );
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);

  if (req.user.role !== "Nurse") {
    return next(
      new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403)
    );
  }
  next();
}
);
// 5. UNIVERSAL AUTHENTICATION (Any valid token)
export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { adminToken, patientToken, doctorToken, nurseToken, chemistToken } = req.cookies;
  const token = adminToken || patientToken || doctorToken || nurseToken || chemistToken;

  if (!token) {
    return next(new ErrorHandler("User is not authenticated!", 400));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    return next(new ErrorHandler("User not found!", 404));
  }
  next();
});

// 6. ROLE AUTHORIZATION (Flexible checks)
export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(`Role: ${req.user.role} is not authorized to access this resource!`, 403)
      );
    }
    next();
  };
};