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

async function runPhase11Tests() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — PHASE 11: COMPLETION & REPORT TESTS     ");
  console.log("=========================================================\n");

  const results = [];
  const record = (id, name, pass, details = "") => {
    results.push({ id, name, pass, details });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${name}${details ? " - " + details : ""}`);
  };

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Attach optional mock generator onto request for testing
  let activeMockGenerator = null;
  app.use((req, res, next) => {
    if (activeMockGenerator) {
      req._generateTextMock = activeMockGenerator;
    }
    next();
  });

  app.use("/api/interview", interviewRoutes);
  app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));

  let server;
  let baseUrl;
  let liveDb = false;

  let owner = null;
  let ownerToken = null;
  let attacker = null;
  let attackerToken = null;

  const createdInterviewIds = [];
  const createdUserIds = [];

  const createFullyAnsweredInterview = async (userId, customScores = [8.0, 7.5, 9.0, 6.5, 8.2]) => {
    const accuracyMap = (s) => (s >= 8 ? "High" : s >= 5 ? "Medium" : s > 0 ? "Low" : "None");
    const interview = await Interview.create({
      userId,
      role: "Senior Backend Engineer",
      experience: "5 years",
      interviewType: "technical",
      resumeSkills: ["Node.js", "MongoDB", "Distributed Systems"],
      questions: [
        {
          question: "How does the Node.js event loop handle asynchronous I/O?",
          userAnswer: "The event loop delegates asynchronous operations to libuv worker threads and processes phase queues.",
          score: customScores[0],
          accuracy: accuracyMap(customScores[0]),
          feedback: "Solid understanding of libuv architecture and queue priorities.",
        },
        {
          question: "Explain compound indexing strategies in MongoDB.",
          userAnswer: "Compound indexes follow the Equality, Sort, Range (ESR) rule to maximize index selectivity.",
          score: customScores[1],
          accuracy: accuracyMap(customScores[1]),
          feedback: "Accurate application of the ESR rule and executionStats.",
        },
        {
          question: "How do you handle concurrency and idempotency in distributed APIs?",
          userAnswer: "We use unique idempotency keys in Redis and conditional database writes to guarantee exactly-once semantics.",
          score: customScores[2],
          accuracy: accuracyMap(customScores[2]),
          feedback: "Great explanation of distributed locking and database-level invariants.",
        },
        {
          question: "What are the trade-offs of microservices vs monoliths?",
          userAnswer: "Microservices enable independent deployment but introduce network latency and distributed data consistency challenges.",
          score: customScores[3],
          accuracy: accuracyMap(customScores[3]),
          feedback: "Clear assessment of operational overhead and architectural trade-offs.",
        },
        {
          question: "How do you design a robust rate limiter?",
          userAnswer: "We use a token bucket or sliding window algorithm implemented via Redis atomic scripts.",
          score: customScores[4],
          accuracy: accuracyMap(customScores[4]),
          feedback: "Strong architectural design with sliding window counter logic.",
        },
      ],
      status: "in_progress",
    });
    createdInterviewIds.push(interview._id);
    return interview;
  };

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
      console.error("FATAL: MongoDB connection required to execute Phase 11 completion tests.");
      process.exit(1);
    }

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // 1. Create two isolated test users
    const uniqueEmailA = `phase11_owner_${Date.now()}@example.com`;
    const uniqueEmailB = `phase11_attacker_${Date.now()}@example.com`;

    owner = await User.create({ name: "Phase11 Owner", email: uniqueEmailA, credits: 100 });
    createdUserIds.push(owner._id);
    ownerToken = await genToken(owner._id);

    attacker = await User.create({ name: "Phase11 Attacker", email: uniqueEmailB, credits: 100 });
    createdUserIds.push(attacker._id);
    attackerToken = await genToken(attacker._id);

    // Initial interview for general tests
    const testInterview = await createFullyAnsweredInterview(owner._id);

    console.log("--- SECTION 1: AUTHENTICATION & IDENTITY ENFORCEMENT ---");

    // TEST 1: Unauthenticated request returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      record("COMP-AUTH-1", "Unauthenticated completion returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    // TEST 2: Invalid session token returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "token=invalid_session_token" },
      });
      const data = await res.json();
      record("COMP-AUTH-2", "Invalid session token returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 2: INPUT & PARAMETER VALIDATION ---");

    // TEST 3: Malformed interview ID returns HTTP 400
    {
      const malformedIds = ["123", "not-a-valid-id", "660f89a9f0293a4b5c6d7e8", "660f89a9f0293a4b5c6d7e89z", "660f89a9f0293a4b5c6d7e$$"];
      let allPassed = true;
      for (const badId of malformedIds) {
        const res = await fetch(`${baseUrl}/api/interview/${badId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        });
        if (res.status !== 400) {
          allPassed = false;
          break;
        }
      }
      record("COMP-VAL-1", "Malformed interview IDs return HTTP 400", allPassed, allPassed ? "All rejected with 400" : "Failed validation");
    }

    // TEST 4: 12-character non-hex ID returns HTTP 400
    {
      const res = await fetch(`${baseUrl}/api/interview/123456789012/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      record("COMP-VAL-1b", "12-character non-hex string strictly returns HTTP 400", res.status === 400, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 3: OWNERSHIP & ACCESS CONTROL ---");

    // TEST 5: Nonexistent interview ID returns HTTP 404
    {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/interview/${fakeId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      record("COMP-OWN-1", "Nonexistent interview returns HTTP 404", res.status === 404 && data.success === false, `Status ${res.status}`);
    }

    // TEST 6: Another user's interview returns HTTP 404
    {
      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${attackerToken}` },
      });
      const data = await res.json();
      record("COMP-OWN-2", "Another user's interview returns HTTP 404 (zero disclosure)", res.status === 404 && data.success === false && data.message === "Interview not found.", `Status ${res.status}`);
    }

    console.log("\n--- SECTION 4: INCOMPLETE INTERVIEW STATE ENFORCEMENT ---");

    // TEST 7: Interview with unanswered questions rejected with HTTP 409
    {
      const unansweredInterview = await Interview.create({
        userId: owner._id,
        role: "Frontend Dev",
        experience: "2 years",
        interviewType: "technical",
        questions: [
          { question: "Q1" },
          { question: "Q2" },
          { question: "Q3" },
          { question: "Q4" },
          { question: "Q5" },
        ],
        status: "in_progress",
      });
      createdInterviewIds.push(unansweredInterview._id);

      const res = await fetch(`${baseUrl}/api/interview/${unansweredInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const inDb = await Interview.findById(unansweredInterview._id);

      record(
        "COMP-STATE-1",
        "Unanswered interview rejected with HTTP 409 and left unchanged",
        res.status === 409 && data.success === false && inDb.status === "in_progress" && inDb.overallScore === undefined,
        `Status ${res.status}`
      );
    }

    // TEST 8: Interview with missing score rejected with HTTP 409
    {
      const missingScoreInterview = await Interview.create({
        userId: owner._id,
        role: "Frontend Dev",
        experience: "2 years",
        interviewType: "technical",
        questions: [
          { question: "Q1", userAnswer: "Ans 1", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q2", userAnswer: "Ans 2", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q3", userAnswer: "Ans 3", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q4", userAnswer: "Ans 4", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q5", userAnswer: "Ans 5", accuracy: "High", feedback: "Good" }, // Score missing
        ],
        status: "in_progress",
      });
      createdInterviewIds.push(missingScoreInterview._id);

      const res = await fetch(`${baseUrl}/api/interview/${missingScoreInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      record("COMP-STATE-2", "Interview with unevaluated score rejected with HTTP 409", res.status === 409, `Status ${res.status}`);
    }

    // TEST 9: Interview with blank feedback rejected with HTTP 409
    {
      const blankFeedbackInterview = await Interview.create({
        userId: owner._id,
        role: "Frontend Dev",
        experience: "2 years",
        interviewType: "technical",
        questions: [
          { question: "Q1", userAnswer: "Ans 1", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q2", userAnswer: "Ans 2", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q3", userAnswer: "Ans 3", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q4", userAnswer: "Ans 4", score: 8, accuracy: "High", feedback: "Good" },
          { question: "Q5", userAnswer: "Ans 5", score: 8, accuracy: "High", feedback: "" }, // Blank feedback
        ],
        status: "in_progress",
      });
      createdInterviewIds.push(blankFeedbackInterview._id);

      const res = await fetch(`${baseUrl}/api/interview/${blankFeedbackInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      record("COMP-STATE-3", "Interview with blank feedback rejected with HTTP 409", res.status === 409, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 5: AI SUMMARY RESILIENCE & FAILURE HANDLING (MOCKED) ---");

    // TEST 10: Non-JSON response from Gemini returns HTTP 502 with zero DB modification
    {
      activeMockGenerator = async () => ({ text: "I am unable to evaluate this right now." });

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const inDb = await Interview.findById(testInterview._id);

      const pass = res.status === 502 && data.success === false && inDb.status === "in_progress" && inDb.overallScore === undefined;
      record("COMP-AI-1", "Non-JSON Gemini response returns HTTP 502 with zero DB modification", pass, `Status ${res.status}`);
    }

    // TEST 11: Missing summaryFeedback field returns HTTP 502 with zero DB modification
    {
      activeMockGenerator = async () => ({ text: JSON.stringify({ score: 8 }) });

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const inDb = await Interview.findById(testInterview._id);

      const pass = res.status === 502 && data.success === false && inDb.status === "in_progress";
      record("COMP-AI-2", "Missing summaryFeedback field returns HTTP 502 with zero DB modification", pass, `Status ${res.status}`);
    }

    // TEST 12: Excessively long summary feedback (> 3000 chars) returns HTTP 502
    {
      activeMockGenerator = async () => ({
        text: JSON.stringify({ summaryFeedback: "X".repeat(3005) }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const inDb = await Interview.findById(testInterview._id);

      const pass = res.status === 502 && inDb.status === "in_progress";
      record("COMP-AI-3", "Excessively long summary feedback (>3000 chars) returns HTTP 502 with zero DB modification", pass, `Status ${res.status}`);
    }

    // TEST 13: Upstream Gemini exception returns HTTP 502 with zero DB modification
    {
      activeMockGenerator = async () => {
        const err = new Error("Upstream service unavailable");
        err.statusCode = 503;
        throw err;
      };

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const inDb = await Interview.findById(testInterview._id);

      const pass = res.status === 502 && inDb.status === "in_progress";
      record("COMP-AI-4", "Upstream Gemini 503 exception handled gracefully with HTTP 502", pass, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 6: SUCCESSFUL COMPLETION, CALCULATION & PERSISTENCE (MOCKED) ---");

    // TEST 14: Valid completion calculates average (7.8), saves summary, updates status to completed
    {
      activeMockGenerator = async () => ({
        text: JSON.stringify({
          summaryFeedback: "Strong performance across backend fundamentals. Demonstrated deep knowledge of libuv event loop and distributed caching. Recommendation: study multi-document transactions in sharded MongoDB clusters.",
        }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const inDb = await Interview.findById(testInterview._id);

      // Mean of [8.0, 7.5, 9.0, 6.5, 8.2] = 39.2 / 5 = 7.84 -> rounded to 1 decimal: 7.8
      const pass =
        res.status === 200 &&
        data.success === true &&
        data.interview.overallScore === 7.8 &&
        data.interview.status === "completed" &&
        data.interview.summaryFeedback.includes("Strong performance across backend fundamentals") &&
        inDb.overallScore === 7.8 &&
        inDb.status === "completed" &&
        inDb.summaryFeedback.includes("Strong performance across backend fundamentals");

      record(
        "COMP-SUCCESS-1",
        "Successful completion persists rounded overall score (7.8), summary, and 'completed' status",
        pass,
        `Score: ${data.interview?.overallScore}, Status: ${data.interview?.status}`
      );
    }

    // TEST 15: Boundary score calculation: All 0s -> overallScore 0.0
    {
      const zeroInterview = await createFullyAnsweredInterview(owner._id, [0, 0, 0, 0, 0]);
      activeMockGenerator = async () => ({
        text: JSON.stringify({ summaryFeedback: "Needs fundamental review." }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${zeroInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      record("COMP-CALC-ZERO", "Boundary score calculation: all 0.0 scores yield overallScore 0.0", res.status === 200 && data.interview.overallScore === 0, `Score: ${data.interview?.overallScore}`);
    }

    // TEST 16: Boundary score calculation: All 10s -> overallScore 10.0
    {
      const maxInterview = await createFullyAnsweredInterview(owner._id, [10, 10, 10, 10, 10]);
      activeMockGenerator = async () => ({
        text: JSON.stringify({ summaryFeedback: "Outstanding mastery." }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${maxInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      record("COMP-CALC-MAX", "Boundary score calculation: all 10.0 scores yield overallScore 10.0", res.status === 200 && data.interview.overallScore === 10, `Score: ${data.interview?.overallScore}`);
    }

    // TEST 17: Fractional rounding verification: sum 37.5 / 5 = 7.5
    {
      const roundInterview = await createFullyAnsweredInterview(owner._id, [7, 7, 7.5, 8, 8]);
      activeMockGenerator = async () => ({
        text: JSON.stringify({ summaryFeedback: "Solid mid-level performance." }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${roundInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      record("COMP-CALC-ROUND", "Fractional rounding calculation: [7, 7, 7.5, 8, 8] correctly yields 7.5", res.status === 200 && data.interview.overallScore === 7.5, `Score: ${data.interview?.overallScore}`);
    }

    // TEST 18: Client spoofed overrides (overallScore, status, summaryFeedback, userId) ignored
    {
      const spoofInterview = await createFullyAnsweredInterview(owner._id, [5, 5, 5, 5, 5]);
      activeMockGenerator = async () => ({
        text: JSON.stringify({ summaryFeedback: "Real server summary." }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${spoofInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({
          overallScore: 10,
          status: "in_progress",
          summaryFeedback: "Hacked client summary",
          userId: attacker._id,
        }),
      });
      const data = await res.json();
      const inDb = await Interview.findById(spoofInterview._id);

      const pass =
        res.status === 200 &&
        data.interview.overallScore === 5.0 &&
        data.interview.status === "completed" &&
        data.interview.summaryFeedback === "Real server summary." &&
        inDb.overallScore === 5.0 &&
        inDb.userId.toString() === owner._id.toString();

      record("COMP-SPOOF-1", "Client-supplied body overrides completely ignored", pass, `Server score: ${data.interview?.overallScore}, Owner preserved: true`);
    }

    // TEST 19: All individual question evaluations remain untouched after completion
    {
      const inDb = await Interview.findById(testInterview._id);
      const q0 = inDb.questions[0];
      const q4 = inDb.questions[4];

      const pass =
        inDb.questions.length === 5 &&
        q0.score === 8.0 &&
        q0.accuracy === "High" &&
        q0.userAnswer.includes("libuv") &&
        q4.score === 8.2 &&
        q4.accuracy === "High" &&
        q4.userAnswer.includes("token bucket");

      record("COMP-PRESERVE-1", "All individual question evaluations and answers preserved untouched", pass, "Individual questions intact: true");
    }

    // TEST 20: Allowlisted response fields strictly enforced (no __v or userId)
    {
      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}`, {
        method: "GET",
        headers: { Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const keys = Object.keys(data.interview);
      const noLeak = !keys.includes("__v") && !keys.includes("userId") && keys.includes("overallScore") && keys.includes("summaryFeedback");

      record("COMP-ALLOWLIST-1", "Completed response matches allowlisted schema without __v or userId", noLeak, `Allowed keys verified: ${noLeak}`);
    }

    console.log("\n--- SECTION 7: IDEMPOTENCY & CONCURRENCY ---");

    // TEST 21: Idempotency: repeated completion on completed interview returns HTTP 200 without calling AI
    {
      let aiCallCount = 0;
      activeMockGenerator = async () => {
        aiCallCount++;
        return { text: JSON.stringify({ summaryFeedback: "New summary" }) };
      };

      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();
      const inDb = await Interview.findById(testInterview._id);

      const pass =
        res.status === 200 &&
        data.success === true &&
        data.message === "Interview is already completed." &&
        aiCallCount === 0 &&
        inDb.summaryFeedback.includes("Strong performance across backend fundamentals");

      record("COMP-IDEMPOTENT-1", "Repeated completion returns saved report (200) without calling AI", pass, `AI calls: ${aiCallCount}`);
    }

    // TEST 22: Concurrency: simultaneous completion requests do not conflict
    {
      const concInterview = await createFullyAnsweredInterview(owner._id, [8, 8, 8, 8, 8]);
      let aiCallCount = 0;
      activeMockGenerator = async () => {
        aiCallCount++;
        await new Promise((r) => setTimeout(r, 100)); // small artificial delay
        return { text: JSON.stringify({ summaryFeedback: "Concurrent summary result." }) };
      };

      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/api/interview/${concInterview._id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        }),
        fetch(`${baseUrl}/api/interview/${concInterview._id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        }),
      ]);

      const statuses = [resA.status, resB.status];
      const bothHandled = (statuses.includes(200) && statuses.includes(409)) || (statuses[0] === 200 && statuses[1] === 200);
      const inDb = await Interview.findById(concInterview._id);
      const pass = bothHandled && inDb.status === "completed" && inDb.overallScore === 8.0 && aiCallCount === 1;

      record("COMP-RACE-1", "Concurrent completion requests handled safely with single AI call", pass, `Statuses: [${statuses.join(", ")}], AI calls: ${aiCallCount}`);
    }

    console.log("\n--- SECTION 8: RETRIEVAL API INTEGRATION ---");

    // TEST 23: GET /api/interview/:id retrieves finalized report
    {
      const res = await fetch(`${baseUrl}/api/interview/${testInterview._id}`, {
        method: "GET",
        headers: { Cookie: `token=${ownerToken}` },
      });
      const data = await res.json();

      const pass =
        res.status === 200 &&
        data.success === true &&
        data.interview.status === "completed" &&
        data.interview.overallScore === 7.8 &&
        typeof data.interview.summaryFeedback === "string" &&
        data.interview.questions.length === 5;

      record("COMP-GET-1", "GET /api/interview/:id returns completed report matching contract", pass, `Status: ${data.interview?.status}, Score: ${data.interview?.overallScore}`);
    }

    console.log("\n--- SECTION 9: LIVE GEMINI SUMMARY DIAGNOSTIC ---");

    // TEST 24: Live Gemini summary generation test
    {
      activeMockGenerator = null; // Use real configured Gemini model
      const liveInterview = await createFullyAnsweredInterview(owner._id, [9, 8.5, 9, 8, 9.5]);

      console.log("Dispatching live final report summary to configured Gemini model...");
      const startTime = Date.now();
      const res = await fetch(`${baseUrl}/api/interview/${liveInterview._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
      });
      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (res.status === 200) {
        const interview = data.interview;
        const pass =
          interview.status === "completed" &&
          interview.overallScore === 8.8 &&
          typeof interview.summaryFeedback === "string" &&
          interview.summaryFeedback.length > 0;

        record(
          "COMP-LIVE-1",
          "Live Gemini generates overall summary feedback and completes interview",
          pass,
          `HTTP 200 in ${elapsed}ms (Overall Score: ${interview.overallScore})`
        );
      } else if (res.status === 502) {
        record(
          "COMP-LIVE-1",
          "Live Gemini returned upstream limitation, handled safely with HTTP 502",
          data.success === false && data.message.includes("temporarily unavailable"),
          `HTTP 502 in ${elapsed}ms: ${data.message}`
        );
      } else {
        record("COMP-LIVE-1", "Live Gemini summary diagnostic", false, `Unexpected status ${res.status}`);
      }
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

runPhase11Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
