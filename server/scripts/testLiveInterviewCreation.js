import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import interviewRoutes from "../routes/interviewRoutes.js";
import User from "../models/user.model.js";
import Interview from "../models/Interview.js";
import genToken from "../config/token.js";
import { DEFAULT_GEMINI_MODEL } from "../config/gemini.js";

async function runLiveInterviewCreationTest() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — LIVE END-TO-END INTERVIEW CREATION TEST  ");
  console.log("=========================================================\n");

  console.log(`ℹ Configured Gemini Model: "${DEFAULT_GEMINI_MODEL}"`);

  let server;
  let testUser = null;
  let createdInterviewId = null;

  try {
    // 1. Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✓ MongoDB Atlas: CONNECTED");

    // 2. Setup Express server with actual live routes (NO MOCKS)
    const app = express();
    app.use(cors({ origin: "http://localhost:5173", credentials: true }));
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/interview", interviewRoutes);

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/api/interview/create`;

    // 3. Create isolated test user & sign session token
    const uniqueEmail = `live_interview_test_${Date.now()}@example.com`;
    testUser = await User.create({
      name: "Alex Rivera",
      email: uniqueEmail,
      credits: 100,
    });
    const sessionToken = await genToken(testUser._id);
    console.log(`✓ Test User Created: ${testUser._id} (${uniqueEmail})`);

    // 4. Send actual live request
    const payload = {
      role: "Full Stack Engineer",
      experience: "3 years",
      interviewType: "technical",
      resumeSkills: ["React", "Node.js", "MongoDB", "Express", "TypeScript"],
    };

    console.log(`\nDispatching live POST /api/interview/create...`);
    const startTime = Date.now();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    console.log(`Response received in ${elapsed}ms: HTTP ${response.status}`);

    if (response.status !== 201 || !data.success || !data.interview) {
      console.error("\n❌ LIVE ENDPOINT TEST FAILED:");
      console.error(`HTTP Status: ${response.status}`);
      console.error(`Response Data:`, JSON.stringify(data, null, 2));
      process.exitCode = 1;
      return;
    }

    createdInterviewId = data.interview._id;
    const interview = data.interview;

    console.log("\n=========================================================");
    console.log("               VERIFICATION CHECKLIST                    ");
    console.log("=========================================================");

    // Check 1: HTTP 201
    const passStatus = response.status === 201;
    console.log(`[${passStatus ? "PASS" : "FAIL"}] HTTP Status is 201 Created`);

    // Check 2: User association
    const passUser = interview.userId.toString() === testUser._id.toString();
    console.log(`[${passUser ? "PASS" : "FAIL"}] Associated with authenticated user (${interview.userId})`);

    // Check 3: Exactly 5 questions
    const qCount = Array.isArray(interview.questions) ? interview.questions.length : 0;
    const passCount = qCount === 5;
    console.log(`[${passCount ? "PASS" : "FAIL"}] Exactly 5 questions generated (got ${qCount})`);

    // Check 4: All questions non-empty strings
    const allNonEmpty = interview.questions.every(
      (q) => typeof q.question === "string" && q.question.trim().length > 0
    );
    console.log(`[${allNonEmpty ? "PASS" : "FAIL"}] All 5 questions are non-empty strings`);

    // Check 5: All questions distinct
    const uniqueQuestions = new Set(interview.questions.map((q) => q.question.trim().toLowerCase()));
    const passUnique = uniqueQuestions.size === 5;
    console.log(`[${passUnique ? "PASS" : "FAIL"}] All 5 questions are distinct (${uniqueQuestions.size}/5 unique)`);

    // Check 6: Lifecycle status is in_progress
    const passLifecycle = interview.status === "in_progress";
    console.log(`[${passLifecycle ? "PASS" : "FAIL"}] Status is 'in_progress'`);

    // Check 7: Scores and feedback initially unset
    const passScores =
      interview.overallScore === undefined &&
      interview.questions.every((q) => q.score === undefined && q.userAnswer === "" && q.feedback === "");
    console.log(`[${passScores ? "PASS" : "FAIL"}] Questions initial state is clean (no premature scores/answers)`);

    // Check 8: Direct MongoDB persistence verification
    const dbRecord = await Interview.findById(createdInterviewId);
    const passDb =
      dbRecord &&
      dbRecord.questions.length === 5 &&
      dbRecord.userId.toString() === testUser._id.toString() &&
      dbRecord.createdAt &&
      dbRecord.updatedAt;
    console.log(`[${passDb ? "PASS" : "FAIL"}] Persisted MongoDB document verified with timestamps`);

    console.log("\n--- Generated Questions ---");
    interview.questions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.question}`);
    });

    const allPassed = passStatus && passUser && passCount && allNonEmpty && passUnique && passLifecycle && passScores && passDb;

    console.log("\n=========================================================");
    console.log(`   FINAL VERIFICATION: ${allPassed ? "ALL 8 CHECKS PASSED ✓" : "FAILURES DETECTED ✗"}`);
    console.log("=========================================================\n");

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution fatal error:", err);
    process.exitCode = 1;
  } finally {
    // 5. Cleanup
    console.log("--- CLEANUP ---");
    if (createdInterviewId) {
      await Interview.findByIdAndDelete(createdInterviewId);
      console.log(`✓ Deleted test interview record: ${createdInterviewId}`);
    }
    if (testUser?._id) {
      await User.findByIdAndDelete(testUser._id);
      console.log(`✓ Deleted test user record: ${testUser._id}`);
    }
    if (server) {
      await server.close();
    }
    await mongoose.disconnect();
    console.log("✓ MongoDB disconnected cleanly");
  }
}

runLiveInterviewCreationTest().catch(console.error);
