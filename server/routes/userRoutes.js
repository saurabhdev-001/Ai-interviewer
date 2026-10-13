import express from "express";
import { loginUser, getUserProfile, getCurrentUser } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/current-user", requireAuth, getCurrentUser);
router.post("/login", loginUser);
router.get("/profile/:id", getUserProfile);

export default router;
