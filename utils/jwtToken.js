import jwt from "jsonwebtoken"; // REQUIRED for jwt.verify
import { User } from "../models/userSchema.js"; // REQUIRED to find the admin
import ErrorHandler from "../middlewares/error.js"; // REQUIRED for your error responses
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";


export const generateToken = (user, message, statusCode, res) => {
  const token = user.generateJsonWebToken();


  // Map roles to specific cookie names
  const roleCookieMap = {
    Admin: 'adminToken',
    Doctor: 'doctorToken',
    Nurse: 'nurseToken',
    Chemist: 'chemistToken',
    Patient: 'patientToken'
  };

  const cookieName = roleCookieMap[user.role] || 'userToken';

  // Security: Clean the user object (remove password and __v)
  const userSafeData = user.toObject();
  delete userSafeData.password;
  delete userSafeData.__v;

  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;

  res
    .status(statusCode)
    .cookie(cookieName, token, {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true,
      sameSite: "None",
    })
    .json({
      success: true,
      message,
      user: userSafeData,
      token,
    });
};

export const isAdminAuthenticated = catchAsyncErrors(async (req, res, next) => {
  // Use the specific cookie name from your role map
  const token = req.cookies.adminToken;

  if (!token) {
    return next(new ErrorHandler("Admin is not authenticated!", 400));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // Attach user to request so Dashboard can use it
  req.user = await User.findById(decoded.id);

  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Access denied. Admin only!", 403));
  }
  next();
});
