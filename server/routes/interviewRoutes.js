import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createInterview,
<<<<<<< HEAD
  getInterviewById,
  getInterviewHistory,
  submitAnswer,
=======
  getInterviewHistory,
  getInterviewById,
  submitAnswer,
  completeInterview,
>>>>>>> bc1ec8dffc63466bce6567d8663484b47b0152a1
} from "../controllers/interviewController.js";

const router = express.Router();

router.post("/create", requireAuth, createInterview);
router.get("/history", requireAuth, getInterviewHistory);
router.get("/:id", requireAuth, getInterviewById);
router.post("/:id/answer", requireAuth, submitAnswer);
router.post("/:id/complete", requireAuth, completeInterview);

export default router;
