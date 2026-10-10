import express from "express";
import { handleResumeUpload } from "../middleware/uploadMiddleware.js";
import { analyzeResume } from "../controllers/resumeController.js";

const router = express.Router();

router.post("/analyze", handleResumeUpload, analyzeResume);

export default router;
