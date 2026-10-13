import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { createInterview, getInterviewById, submitAnswer } from "../controllers/interviewController.js";

const router = express.Router();

router.post("/create", requireAuth, createInterview);
router.get("/:id", requireAuth, getInterviewById);
router.post("/:id/answer", requireAuth, submitAnswer);

export default router;
