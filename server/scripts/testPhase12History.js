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

async function runPhase12Tests() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — PHASE 12: INTERVIEW HISTORY TESTS       ");
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
  let emptyUser = null;
  let emptyToken = null;

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
      console.error("FATAL: MongoDB connection required to execute Phase 12 history tests.");
      process.exit(1);
    }

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // 1. Create three synthetic test users
    const uniqueA = `phase12_userA_${Date.now()}@example.com`;
    const uniqueB = `phase12_userB_${Date.now()}@example.com`;
    const uniqueEmpty = `phase12_empty_${Date.now()}@example.com`;

    userA = await User.create({ name: "Phase12 UserA", email: uniqueA });
    createdUserIds.push(userA._id);
    tokenA = await genToken(userA._id);

    userB = await User.create({ name: "Phase12 UserB", email: uniqueB });
    createdUserIds.push(userB._id);
    tokenB = await genToken(userB._id);

    emptyUser = await User.create({ name: "Phase12 EmptyUser", email: uniqueEmpty });
    createdUserIds.push(emptyUser._id);
    emptyToken = await genToken(emptyUser._id);

    // 2. Create 5 sample interviews for UserA with sequential timestamps
    const baseDate = new Date("2026-10-01T10:00:00Z");
    const sampleQuestions = [
      { question: "Q1", userAnswer: "Ans 1", score: 8, accuracy: "High", feedback: "Good" },
      { question: "Q2", userAnswer: "Ans 2", score: 7, accuracy: "Medium", feedback: "Decent" },
      { question: "Q3", userAnswer: "Ans 3", score: 9, accuracy: "High", feedback: "Great" },
      { question: "Q4", userAnswer: "Ans 4", score: 6, accuracy: "Medium", feedback: "Okay" },
      { question: "Q5", userAnswer: "Ans 5", score: 8.5, accuracy: "High", feedback: "Well done" },
    ];

    // Interview 1: Oldest, completed
    const intA1 = await Interview.create({
      userId: userA._id,
      role: "Junior React Dev",
      experience: "1 year",
      interviewType: "technical",
      resumeSkills: ["React"],
      questions: sampleQuestions,
      overallScore: 7.7,
      summaryFeedback: "Good start.",
      status: "completed",
      createdAt: new Date(baseDate.getTime() + 1000),
    });
    createdInterviewIds.push(intA1._id);

    // Interview 2: in_progress
    const intA2 = await Interview.create({
      userId: userA._id,
      role: "Node.js Developer",
      experience: "2 years",
      interviewType: "technical",
      resumeSkills: ["Node.js"],
      questions: sampleQuestions,
      status: "in_progress",
      createdAt: new Date(baseDate.getTime() + 2000),
    });
    createdInterviewIds.push(intA2._id);

    // Interview 3: completed
    const intA3 = await Interview.create({
      userId: userA._id,
      role: "Backend Architect",
      experience: "7 years",
      interviewType: "technical",
      resumeSkills: ["Node.js", "Redis"],
      questions: sampleQuestions,
      overallScore: 9.0,
      summaryFeedback: "Excellent architectural grasp.",
      status: "completed",
      createdAt: new Date(baseDate.getTime() + 3000),
    });
    createdInterviewIds.push(intA3._id);

    // Interview 4: HR completed
    const intA4 = await Interview.create({
      userId: userA._id,
      role: "Engineering Manager",
      experience: "8 years",
      interviewType: "hr",
      resumeSkills: ["Leadership"],
      questions: sampleQuestions,
      overallScore: 8.5,
      summaryFeedback: "Strong leadership communication.",
      status: "completed",
      createdAt: new Date(baseDate.getTime() + 4000),
    });
    createdInterviewIds.push(intA4._id);

    // Interview 5: Newest, in_progress
    const intA5 = await Interview.create({
      userId: userA._id,
      role: "Staff Engineer",
      experience: "10 years",
      interviewType: "technical",
      resumeSkills: ["System Design"],
      questions: sampleQuestions,
      status: "in_progress",
      createdAt: new Date(baseDate.getTime() + 5000),
    });
    createdInterviewIds.push(intA5._id);

    // 3. Create 2 interviews for UserB
    const intB1 = await Interview.create({
      userId: userB._id,
      role: "DevOps Engineer",
      experience: "4 years",
      interviewType: "technical",
      resumeSkills: ["Kubernetes"],
      questions: sampleQuestions,
      status: "in_progress",
      createdAt: new Date(baseDate.getTime() + 6000),
    });
    createdInterviewIds.push(intB1._id);

    const intB2 = await Interview.create({
      userId: userB._id,
      role: "Security Engineer",
      experience: "5 years",
      interviewType: "technical",
      resumeSkills: ["OAuth"],
      questions: sampleQuestions,
      overallScore: 8.8,
      status: "completed",
      createdAt: new Date(baseDate.getTime() + 7000),
    });
    createdInterviewIds.push(intB2._id);

    console.log("--- SECTION 1: AUTHENTICATION ENFORCEMENT ---");

    // TEST 1: Unauthenticated request returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/history`);
      const data = await res.json();
      record("HIST-AUTH-1", "Unauthenticated request returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    // TEST 2: Invalid session token returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: "token=invalid_session_token" },
      });
      const data = await res.json();
      record("HIST-AUTH-2", "Invalid session token returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 2: ROUTE ORDER & ISOLATION ---");

    // TEST 3: Route-order verification: /history is handled by history endpoint, not :id
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      // If Express incorrectly matched /:id, it would return 400 "Invalid interview ID format."
      const pass = res.status === 200 && data.success === true && Array.isArray(data.interviews);
      record("HIST-ROUTE-1", "GET /api/interview/history matched before /:id route", pass, `Status ${res.status}, Array: ${Array.isArray(data.interviews)}`);
    }

    console.log("\n--- SECTION 3: OWNERSHIP & ACCESS CONTROL ---");

    // TEST 4: User receives only their own interviews (UserA has 5, none from UserB)
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const ids = data.interviews.map((i) => i._id);
      const userBIds = [intB1._id.toString(), intB2._id.toString()];
      const leaksUserB = ids.some((id) => userBIds.includes(id));
      const hasAllUserA = ids.length === 5;

      record("HIST-OWN-1", "User receives only their own interviews (no cross-user leakage)", !leaksUserB && hasAllUserA, `Count: ${ids.length}, Leaked: ${leaksUserB}`);
    }

    // TEST 5: Spoofed userId in query parameter is completely ignored
    {
      const res = await fetch(`${baseUrl}/api/interview/history?userId=${userB._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const ids = data.interviews.map((i) => i._id);
      const userBIds = [intB1._id.toString(), intB2._id.toString()];
      const leaksUserB = ids.some((id) => userBIds.includes(id));

      record("HIST-SPOOF-1", "Spoofed userId in query parameters strictly ignored", !leaksUserB && data.interviews.length === 5, `Count: ${data.interviews.length}`);
    }

    console.log("\n--- SECTION 4: DATA INTEGRITY & ALLOWLISTING ---");

    // TEST 6: Both in_progress and completed interviews appear with valid scores
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const inProg = data.interviews.find((i) => i.status === "in_progress");
      const comp = data.interviews.find((i) => i.status === "completed");

      const pass =
        inProg &&
        inProg.overallScore === null &&
        comp &&
        typeof comp.overallScore === "number" &&
        comp.overallScore >= 0 &&
        comp.overallScore <= 10;

      record("HIST-STATUS-1", "Both in_progress and completed interviews included with appropriate scores", Boolean(pass), `in_progress score: ${inProg?.overallScore}, completed score: ${comp?.overallScore}`);
    }

    // TEST 7: Response strictly excludes __v, userId, resumeSkills, and question subdocuments
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const firstItem = data.interviews[0];
      const keys = Object.keys(firstItem);

      const pass =
        !keys.includes("__v") &&
        !keys.includes("userId") &&
        !keys.includes("resumeSkills") &&
        !keys.includes("questions") &&
        !keys.includes("summaryFeedback") &&
        keys.includes("_id") &&
        keys.includes("role") &&
        keys.includes("experience") &&
        keys.includes("interviewType") &&
        keys.includes("overallScore") &&
        keys.includes("status") &&
        keys.includes("createdAt") &&
        keys.includes("updatedAt");

      record("HIST-ALLOWLIST-1", "Response excludes __v, userId, questions, and sensitive fields", pass, `Keys: [${keys.join(", ")}]`);
    }

    console.log("\n--- SECTION 5: SORTING & DETERMINISTIC ORDER ---");

    // TEST 8: Results sorted newest first by createdAt descending
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const dates = data.interviews.map((i) => new Date(i.createdAt).getTime());
      const isSorted = dates.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
      const newestRole = data.interviews[0].role; // Staff Engineer (intA5)

      record("HIST-SORT-1", "Results sorted newest first by createdAt descending", isSorted && newestRole === "Staff Engineer", `Newest role: ${newestRole}`);
    }

    console.log("\n--- SECTION 6: PAGINATION & BOUNDARY VALIDATION ---");

    // TEST 9: Pagination page 1 limit 2 returns first 2 items with total=5, totalPages=3
    {
      const res = await fetch(`${baseUrl}/api/interview/history?page=1&limit=2`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const pass =
        res.status === 200 &&
        data.interviews.length === 2 &&
        data.pagination.page === 1 &&
        data.pagination.limit === 2 &&
        data.pagination.total === 5 &&
        data.pagination.totalPages === 3 &&
        data.interviews[0]._id === intA5._id.toString() &&
        data.interviews[1]._id === intA4._id.toString();

      record("HIST-PAGE-1", "Page 1 limit 2 returns first 2 items with valid metadata", pass, `Count: ${data.interviews.length}, Total: ${data.pagination.total}, Pages: ${data.pagination.totalPages}`);
    }

    // TEST 10: Pagination page 2 limit 2 returns next 2 items without duplication
    {
      const res = await fetch(`${baseUrl}/api/interview/history?page=2&limit=2`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const pass =
        res.status === 200 &&
        data.interviews.length === 2 &&
        data.pagination.page === 2 &&
        data.pagination.limit === 2 &&
        data.interviews[0]._id === intA3._id.toString() &&
        data.interviews[1]._id === intA2._id.toString();

      record("HIST-PAGE-2", "Page 2 limit 2 returns next 2 items with correct offset", pass, `First role on page 2: ${data.interviews[0]?.role}`);
    }

    // TEST 11: Invalid page parameter returns HTTP 400
    {
      const invalidPages = ["0", "-1", "abc", "1.5", "null", "undefined"];
      let allPassed = true;
      for (const p of invalidPages) {
        const res = await fetch(`${baseUrl}/api/interview/history?page=${p}`, {
          headers: { Cookie: `token=${tokenA}` },
        });
        if (res.status !== 400) {
          allPassed = false;
          break;
        }
      }
      record("HIST-VAL-PAGE", "Invalid page parameters (0, negative, decimals, non-ints) return HTTP 400", allPassed, allPassed ? "All rejected with 400" : "Failed validation");
    }

    // TEST 12: Invalid limit parameter returns HTTP 400
    {
      const invalidLimits = ["0", "-5", "xyz", "10.5", "60", "100"];
      let allPassed = true;
      for (const l of invalidLimits) {
        const res = await fetch(`${baseUrl}/api/interview/history?limit=${l}`, {
          headers: { Cookie: `token=${tokenA}` },
        });
        if (res.status !== 400) {
          allPassed = false;
          break;
        }
      }
      record("HIST-VAL-LIMIT", "Invalid limit parameters (0, negative, decimals, >50) return HTTP 400", allPassed, allPassed ? "All rejected with 400" : "Failed validation");
    }

    // TEST 13: Enforce maximum limit boundary: limit=50 succeeds, limit=51 rejected with 400
    {
      const res50 = await fetch(`${baseUrl}/api/interview/history?limit=50`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const res51 = await fetch(`${baseUrl}/api/interview/history?limit=51`, {
        headers: { Cookie: `token=${tokenA}` },
      });

      const pass = res50.status === 200 && res51.status === 400;
      record("HIST-MAX-LIMIT", "Maximum limit boundary: limit=50 returns 200, limit=51 returns 400", pass, `res50: ${res50.status}, res51: ${res51.status}`);
    }

    console.log("\n--- SECTION 7: EMPTY USER HANDLING ---");

    // TEST 14: User with zero interviews receives HTTP 200, empty list, and valid pagination metadata
    {
      const res = await fetch(`${baseUrl}/api/interview/history`, {
        headers: { Cookie: `token=${emptyToken}` },
      });
      const data = await res.json();
      const pass =
        res.status === 200 &&
        data.success === true &&
        Array.isArray(data.interviews) &&
        data.interviews.length === 0 &&
        data.pagination.page === 1 &&
        data.pagination.limit === 10 &&
        data.pagination.total === 0 &&
        data.pagination.totalPages === 0;

      record("HIST-EMPTY-1", "User with zero interviews receives empty list and valid pagination (total: 0, totalPages: 0)", pass, `Array length: ${data.interviews?.length}, Total: ${data.pagination?.total}`);
    }

    console.log("\n--- SECTION 8: REGRESSION & COMPATIBILITY ---");

    // TEST 15: Existing GET /api/interview/:id retrieval still functions normally
    {
      const res = await fetch(`${baseUrl}/api/interview/${intA1._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      });
      const data = await res.json();
      const pass =
        res.status === 200 &&
        data.success === true &&
        data.interview._id === intA1._id.toString() &&
        data.interview.questions.length === 5;

      record("HIST-REG-1", "Existing GET /api/interview/:id continues to work without interference", pass, `Status ${res.status}, Questions: ${data.interview?.questions?.length}`);
    }

  } finally {
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

runPhase12Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
