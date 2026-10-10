import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/connectDb.js";
import userRoutes from "./routes/userRoutes.js";


const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Root Health & Status Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "InterviewIQ API is running",
  });
});

// API Routes
app.use("/api/user", userRoutes);

// Database Connection & Server Listener
connectDB();

app.listen(PORT, () => {
  console.log(`InterviewIQ Server running on port ${PORT}`);
});