import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createInterview,
  getInterviewHistory,
  getInterviewById,
  submitAnswer,
  completeInterview,
} from "../controllers/interviewController.js";

const router = express.Router();

router.post("/create", requireAuth, createInterview);
router.get("/history", requireAuth, getInterviewHistory);
router.get("/:id", requireAuth, getInterviewById);
router.post("/:id/answer", requireAuth, submitAnswer);
router.post("/:id/complete", requireAuth, completeInterview);

export default router;
