import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { createInterview } from "../controllers/interviewController.js";

const router = express.Router();

router.post("/create", requireAuth, createInterview);

export default router;
