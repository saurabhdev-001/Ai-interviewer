import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import interviewRoutes from "../routes/interviewRoutes.js";
import User from "../models/user.model.js";
import Interview from "../models/Interview.js";
import genToken from "../config/token.js";

async function runPhase9Tests() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — PHASE 9: INTERVIEW RETRIEVAL TESTS      ");
  console.log("=========================================================\n");

  const results = [];
  const record = (id, name, pass, details = "") => {
    results.push({ id, name, pass, details });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${name}${details ? " - " + details : ""}`);
  };

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/interview", interviewRoutes);
  app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));

  let server;
  let baseUrl;
  let liveDb = false;

  let userA = null;
  let tokenA = null;
  let userB = null;
  let tokenB = null;

  let inProgressInterview = null;
  let completedInterview = null;
  const createdInterviewIds = [];
  const createdUserIds = [];

  try {
    if (process.env.MONGO_URI) {
      try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 5000 });
        liveDb = true;
        console.log("✓ Live MongoDB Atlas: CONNECTED\n");
      } catch (dbErr) {
        console.log("ℹ Live MongoDB Atlas: UNREACHABLE (" + dbErr.message + "). Cannot run integration tests.\n");
      }
    }

    if (!liveDb) {
      console.error("FATAL: MongoDB connection required to execute Phase 9 database retrieval tests.");
      process.exit(1);
    }

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // 1. Create two isolated test users
    const uniqueEmailA = `phase9_owner_${Date.now()}@example.com`;
    const uniqueEmailB = `phase9_attacker_${Date.now()}@example.com`;

    userA = await User.create({ name: "Phase9 Owner", email: uniqueEmailA, credits: 100 });
    createdUserIds.push(userA._id);
    tokenA = await genToken(userA._id);

    userB = await User.create({ name: "Phase9 Attacker", email: uniqueEmailB, credits: 100 });
    createdUserIds.push(userB._id);
    tokenB = await genToken(userB._id);

    // 2. Create an in-progress interview owned by User A
    inProgressInterview = await Interview.create({
      userId: userA._id,
      role: "Backend Engineer",
      experience: "4 years",
      interviewType: "technical",
      resumeSkills: ["Node.js", "Express", "MongoDB"],
      questions: [
        { question: "How does the Node event loop handle I/O operations?" },
        { question: "Explain MongoDB indexing strategies for compound keys." },
        { question: "How do you handle unhandled promise rejections in Express?" },
        { question: "What is the difference between processes and worker threads?" },
        { question: "How do you protect REST APIs against CSRF and XSS attacks?" },
      ],
      status: "in_progress",
    });
    createdInterviewIds.push(inProgressInterview._id);

    // 3. Create a completed interview owned by User A
    completedInterview = await Interview.create({
      userId: userA._id,
      role: "HR Manager",
      experience: "5 years",
      interviewType: "hr",
      resumeSkills: ["Communication", "Conflict Resolution"],
      questions: [
        {
          question: "How do you handle workplace conflict between senior team members?",
          userAnswer: "I arrange individual mediation followed by a structured alignment discussion.",
          score: 8.5,
          accuracy: "High",
          feedback: "Demonstrates clear de-escalation framework and structured leadership.",
        },
        {
          question: "Describe your strategy for maintaining team morale under tight deadlines.",
          userAnswer: "Transparent priority triaging and daily milestone check-ins.",
          score: 9.0,
          accuracy: "High",
          feedback: "Actionable prioritization and team support mechanisms.",
        },
        {
          question: "How do you provide negative performance feedback constructively?",
          userAnswer: "Using the SBI framework with specific behavioral examples.",
          score: 8.0,
          accuracy: "High",
          feedback: "Structured SBI approach is industry standard.",
        },
        {
          question: "How do you approach onboarding new hires to ensure early retention?",
          userAnswer: "30-60-90 day roadmap with dedicated mentorship buddies.",
          score: 9.5,
          accuracy: "High",
          feedback: "Thorough onboarding blueprint with retention safeguards.",
        },
        {
          question: "What strategies do you use for equitable compensation reviews?",
          userAnswer: "Band-based benchmarking and blind merit matrix assessments.",
          score: 8.5,
          accuracy: "High",
          feedback: "Mitigates bias and adheres to structured pay equity.",
        },
      ],
      overallScore: 8.7,
      summaryFeedback: "Outstanding leadership and behavioral competencies across all competencies.",
      status: "completed",
    });
    createdInterviewIds.push(completedInterview._id);

    console.log("--- SECTION 1: AUTHENTICATION ENFORCEMENT ---");

    // TEST 1: Unauthenticated request rejected with HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}`);
      const data = await res.json();
      record(
        "RET-AUTH-1",
        "Unauthenticated request returns HTTP 401",
        res.status === 401 && data.success === false,
        `Status ${res.status}`
      );
    }

    // TEST 2: Invalid session token rejected with HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}`, {
        headers: { Cookie: "token=invalid_garbage_token" },
      });
      const data = await res.json();
      record(
        "RET-AUTH-2",
        "Invalid session token returns HTTP 401",
        res.status === 401 && data.success === false,
        `Status ${res.status}`
      );
    }

    // TEST 3: Bearer token header authenticates successfully
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      record(
        "RET-AUTH-3",
        "Authorization Bearer header authenticates successfully",
        res.status === 200 && data.success === true,
        `Status ${res.status}`
      );
    }

    console.log("\n--- SECTION 2: PARAMETER VALIDATION & ERROR HANDLING ---");

    // TEST 4: Malformed interview ID returns HTTP 400
    {
      const malformedIds = ["not-an-id", "12345", "507f1f77bcf86cd79943901z", "null", "undefined", "abcdefghijkl"];
      let allPassed = true;
      for (const mId of malformedIds) {
        const res = await fetch(`${baseUrl}/api/interview/${mId}`, {
          headers: { Cookie: `token=${tokenA}` },
        });
        const data = await res.json();
        if (res.status !== 400 || data.success !== false) {
          allPassed = false;
          break;
        }
      }
      record(
        "RET-VAL-1",
        "Malformed interview ID returns HTTP 400",
        allPassed,
        allPassed ? "All malformed IDs rejected with 400" : "Failed on malformed ID"
      );
    }

    // TEST 4b: 12-character non-hexadecimal ID strictly returns HTTP 400
    {
      const twelveCharNonHex = "abcdefghijkl";
      const res = await fetch(`${baseUrl}/api/interview/${twelveCharNonHex}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      record(
        "RET-VAL-1b",
        "12-character non-hexadecimal ID strictly rejected with HTTP 400",
        res.status === 400 && data.success === false && data.message === "Invalid interview ID format.",
        `Status ${res.status}`
      );
    }

    // TEST 5: Nonexistent valid ObjectId returns HTTP 404
    {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/interview/${nonExistentId}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      record(
        "RET-VAL-2",
        "Nonexistent valid interview ID returns HTTP 404",
        res.status === 404 && data.success === false && data.message === "Interview not found.",
        `Status ${res.status}`
      );
    }

    console.log("\n--- SECTION 3: OWNERSHIP ENFORCEMENT & SECURITY ---");

    // TEST 6: User cannot retrieve another user's interview (returns 404, identical to nonexistent)
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}`, {
        headers: { Cookie: `token=${tokenB}` },
      });
      const data = await res.json();
      record(
        "RET-SEC-1",
        "User cannot access another user's interview (HTTP 404, no disclosure)",
        res.status === 404 && data.success === false && data.message === "Interview not found.",
        `Status ${res.status}`
      );
    }

    // TEST 7: Attempting to spoof owner ID via query or body has zero effect
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}?userId=${userA._id}`, {
        method: "GET",
        headers: {
          Cookie: `token=${tokenB}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      record(
        "RET-SEC-2",
        "Spoofed userId in query/params is ignored by server-verified session",
        res.status === 404 && data.success === false,
        `Status ${res.status}`
      );
    }

    console.log("\n--- SECTION 4: RETRIEVAL & CONTRACT VERIFICATION ---");

    // TEST 8: Authenticated owner retrieves in-progress interview (HTTP 200)
    let inProgressRetrieved = null;
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      inProgressRetrieved = data.interview;
      record(
        "RET-DATA-1",
        "Owner retrieves in-progress interview with HTTP 200",
        res.status === 200 && data.success === true && inProgressRetrieved !== null,
        `Status ${res.status}`
      );
    }

    // TEST 9: In-progress interview contains exactly 5 questions and expected fields
    {
      const q = inProgressRetrieved?.questions;
      const is5Questions = Array.isArray(q) && q.length === 5;
      const allHaveIds = q?.every((item) => item._id && typeof item.question === "string" && item.question.length > 0);
      const defaultsCorrect = q?.every((item) => item.userAnswer === "" && item.feedback === "");
      record(
        "RET-DATA-2",
        "Retrieved interview contains exactly 5 questions with IDs and defaults",
        is5Questions && allHaveIds && defaultsCorrect,
        `Count: ${q?.length}`
      );
    }

    // TEST 10: Response excludes __v and internal userId
    {
      const hasNoVersion = inProgressRetrieved?.__v === undefined;
      const hasNoUserId = inProgressRetrieved?.userId === undefined;
      const allowedKeys = [
        "_id",
        "role",
        "experience",
        "interviewType",
        "resumeSkills",
        "questions",
        "overallScore",
        "summaryFeedback",
        "status",
        "createdAt",
        "updatedAt",
      ];
      const actualKeys = Object.keys(inProgressRetrieved || {});
      const onlyAllowed = actualKeys.every((k) => allowedKeys.includes(k));
      record(
        "RET-DATA-3",
        "Response excludes __v, internal userId, and only returns allowlisted fields",
        hasNoVersion && hasNoUserId && onlyAllowed,
        `Allowed keys verified: ${onlyAllowed}`
      );
    }

    // TEST 11: Retrieval is read-only (document in MongoDB not modified)
    {
      const rawInDb = await Interview.findById(inProgressInterview._id);
      const unchanged =
        rawInDb.updatedAt.getTime() === inProgressInterview.updatedAt.getTime() &&
        rawInDb.questions.length === 5 &&
        rawInDb.status === "in_progress";
      record(
        "RET-DATA-4",
        "Retrieval is strictly read-only (MongoDB timestamps and data unchanged)",
        unchanged,
        `UpdatedAt matched: ${unchanged}`
      );
    }

    // TEST 12: Authenticated owner retrieves completed interview with all saved evaluation data
    {
      const res = await fetch(`${baseUrl}/api/interview/${completedInterview._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const comp = data.interview;
      const statusCorrect = comp?.status === "completed";
      const scoreCorrect = comp?.overallScore === 8.7;
      const summaryCorrect = comp?.summaryFeedback.includes("Outstanding leadership");
      const questionsEvaluated = comp?.questions?.every(
        (q) => q.score >= 0 && q.score <= 10 && q.userAnswer && q.accuracy && q.feedback
      );
      record(
        "RET-DATA-5",
        "Completed interview preserves answers, scores (0-10), accuracy, and feedback",
        res.status === 200 && statusCorrect && scoreCorrect && summaryCorrect && questionsEvaluated,
        `Overall score: ${comp?.overallScore}, Status: ${comp?.status}`
      );
    }

  } finally {
    // Cleanup created test records
    if (liveDb) {
      if (createdInterviewIds.length > 0) {
        await Interview.deleteMany({ _id: { $in: createdInterviewIds } });
        console.log(`\n✓ Cleaned up ${createdInterviewIds.length} test interview(s) from MongoDB`);
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        console.log(`✓ Cleaned up ${createdUserIds.length} test user(s) from MongoDB`);
      }
      await mongoose.disconnect();
    }
    if (server) {
      server.close();
    }
  }

  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log("\n=========================================================");
  console.log(`   TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("=========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
