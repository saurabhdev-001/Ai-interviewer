import mongoose from "mongoose";
import User from "../models/User.js";

/**
 * POST /api/user/login
 * Validates name and email, normalizes email, finds or creates user.
 */
export const loginUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required and must be a non-empty string",
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required and must be a non-empty string",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Find existing user or create a new one
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      return res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user,
      });
    }

    try {
      user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user,
      });
    } catch (createError) {
      // Handle potential race condition on unique email index
      if (createError.code === 11000) {
        user = await User.findOne({ email: normalizedEmail });
        if (user) {
          return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user,
          });
        }
      }
      throw createError;
    }
  } catch (error) {
    console.error("Login controller error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing login",
    });
  }
};

/**
 * GET /api/user/profile/:id
 * Validates MongoDB ObjectId, retrieves user document, returns 404 if not found.
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile controller error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving user profile",
    });
  }
};
