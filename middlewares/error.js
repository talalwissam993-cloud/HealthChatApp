class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  // 1. Set default values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // 2. Handle MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // 3. Handle Invalid JWT
  if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid, Try again!`;
    err = new ErrorHandler(message, 400);
  }

  // 4. Handle Expired JWT
  if (err.name === "TokenExpiredError") {
    const message = `Json Web Token is expired, Try again!`;
    err = new ErrorHandler(message, 400);
  }

  // 5. Handle Mongoose CastError (e.g., invalid ObjectID)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // 6. Handle Mongoose Validation Errors (e.g., required fields)
  // This maps through all errors and joins them into a single string
  const errorMessage = err.errors
    ? Object.values(err.errors)
      .map((error) => error.message)
      .join(" ")
    : err.message;

  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;