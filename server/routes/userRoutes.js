import express from "express";
import { loginUser, getUserProfile } from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginUser);
router.get("/profile/:id", getUserProfile);

export default router;
