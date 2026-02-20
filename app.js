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

// 1. MOBILE-FRIENDLY CORS
app.use(
    cors({
        origin: true, 
        methods: ["GET", "POST", "DELETE", "PUT"],
        credentials: true,
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. FILE UPLOAD
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
}));

// 3. DATABASE
dbConnection();

// 4. PUBLIC HEALTH CHECK (Consolidated for UptimeRobot)
// Use this URL in UptimeRobot: https://healthchatapp.onrender.com/ping
app.get("/ping", (req, res) => {
    res.status(200).send("pong");
});

// 5. ROUTES
app.use("/api/v1/user", userRouter);

// 6. ERROR MIDDLEWARE
app.use(errorMiddleware);

export default app;
