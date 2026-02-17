import mongoose from "mongoose";

export const dbConnection = () => {
    mongoose
        // @ts-ignore
        .connect(process.env.MONGO_URI, {
            dbName: "HealthChat",
        })
        .then(() => {
            console.log("Connected to database!");
        })
        .catch((err) => {
            console.log("Some error occured while connecting to database:", err);
        });
};
