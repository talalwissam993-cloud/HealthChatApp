import express from "express";
import { dbConnection } from "./database/dbConnection.js";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import { errorMiddleware } from "./middlewares/error.js";

import userRouter from "./router/userRouter.js";

const app = express();
config({ path: "./config/config.env" });

// 1. CORS Configuration
app.use(
    cors({
        origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL], // Fixed DASHBOARD_URL casing
        methods: ["GET", "POST", "DELETE", "PUT"],
        credentials: true,
    })
);

// 2. Standard Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. File Upload Configuration (Essential for docAvatar)
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    // Add this to prevent the "not eligible" warning on JSON routes
    createParentPath: true,
    parseNested: true,
}));

// 4. Database Connection
dbConnection();




// 5. Routes Integration
app.use("/api/v1/user", userRouter);





// 6. Global Error Middleware (MUST be at the bottom)
app.use(errorMiddleware);

export default app;
