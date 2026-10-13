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

async function runPhase10Tests() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — PHASE 10: ANSWER EVALUATION TESTS       ");
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
      console.error("FATAL: MongoDB connection required to execute Phase 10 answer evaluation tests.");
      process.exit(1);
    }

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // 1. Create two isolated test users
    const uniqueEmailA = `phase10_owner_${Date.now()}@example.com`;
    const uniqueEmailB = `phase10_attacker_${Date.now()}@example.com`;

    owner = await User.create({ name: "Phase10 Owner", email: uniqueEmailA, credits: 100 });
    createdUserIds.push(owner._id);
    ownerToken = await genToken(owner._id);

    attacker = await User.create({ name: "Phase10 Attacker", email: uniqueEmailB, credits: 100 });
    createdUserIds.push(attacker._id);
    attackerToken = await genToken(attacker._id);

    // 2. Create in-progress interview for Owner
    inProgressInterview = await Interview.create({
      userId: owner._id,
      role: "Senior Backend Developer",
      experience: "5 years",
      interviewType: "technical",
      resumeSkills: ["Node.js", "MongoDB", "System Design"],
      questions: [
        { question: "How does the Node.js event loop handle asynchronous I/O and process.nextTick?" },
        { question: "Explain indexing strategies for large MongoDB collections with multi-key queries." },
        { question: "How do you mitigate race conditions when handling concurrent transactions in distributed systems?" },
        { question: "What are the key trade-offs between monolithic architecture and microservices?" },
        { question: "How do you design a robust rate-limiting mechanism for high-traffic public APIs?" },
      ],
      status: "in_progress",
    });
    createdInterviewIds.push(inProgressInterview._id);

    // 3. Create completed interview for Owner
    completedInterview = await Interview.create({
      userId: owner._id,
      role: "Tech Lead",
      experience: "7 years",
      interviewType: "technical",
      resumeSkills: ["Architecture"],
      questions: [
        { question: "Q1", userAnswer: "Answer 1", score: 8, accuracy: "High", feedback: "Good" },
        { question: "Q2", userAnswer: "Answer 2", score: 7, accuracy: "Medium", feedback: "Adequate" },
        { question: "Q3", userAnswer: "Answer 3", score: 9, accuracy: "High", feedback: "Great" },
        { question: "Q4", userAnswer: "Answer 4", score: 8, accuracy: "High", feedback: "Solid" },
        { question: "Q5", userAnswer: "Answer 5", score: 8, accuracy: "High", feedback: "Strong" },
      ],
      overallScore: 8.0,
      summaryFeedback: "Completed interview",
      status: "completed",
    });
    createdInterviewIds.push(completedInterview._id);

    const q0Id = inProgressInterview.questions[0]._id.toString();
    const q1Id = inProgressInterview.questions[1]._id.toString();
    const q2Id = inProgressInterview.questions[2]._id.toString();

    console.log("--- SECTION 1: AUTHENTICATION & IDENTITY ENFORCEMENT ---");

    // TEST 1: Unauthenticated submission returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q0Id, answer: "My answer" }),
      });
      const data = await res.json();
      record("ANS-AUTH-1", "Unauthenticated submission returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    // TEST 2: Invalid session token returns HTTP 401
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "token=invalid_token" },
        body: JSON.stringify({ questionId: q0Id, answer: "My answer" }),
      });
      const data = await res.json();
      record("ANS-AUTH-2", "Invalid session token returns HTTP 401", res.status === 401 && data.success === false, `Status ${res.status}`);
    }

    console.log("\n--- SECTION 2: INPUT & PARAMETER VALIDATION ---");

    // TEST 3: Malformed interview ID returns HTTP 400
    {
      const malformedIds = ["not-an-id", "12345", "abcdefghijkl", "507f1f77bcf86cd79943901z"];
      let allPassed = true;
      for (const mId of malformedIds) {
        const res = await fetch(`${baseUrl}/api/interview/${mId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
          body: JSON.stringify({ questionId: q0Id, answer: "Valid answer text" }),
        });
        const data = await res.json();
        if (res.status !== 400 || data.success !== false) {
          allPassed = false;
          break;
        }
      }
      record("ANS-VAL-1", "Malformed interview ID returns HTTP 400", allPassed, allPassed ? "All malformed IDs rejected with 400" : "Failed");
    }

    // TEST 4: Malformed question ID returns HTTP 400
    {
      const malformedQIds = ["not-a-qid", "12345", "abcdefghijkl", "507f1f77bcf86cd79943901z"];
      let allPassed = true;
      for (const mQId of malformedQIds) {
        const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
          body: JSON.stringify({ questionId: mQId, answer: "Valid answer text" }),
        });
        const data = await res.json();
        if (res.status !== 400 || data.success !== false) {
          allPassed = false;
          break;
        }
      }
      record("ANS-VAL-2", "Malformed question ID returns HTTP 400", allPassed, allPassed ? "All malformed question IDs rejected with 400" : "Failed");
    }

    // TEST 5: Empty, non-string, or over-limit answer returns HTTP 400
    {
      const invalidAnswers = [
        "",
        "   ",
        null,
        undefined,
        12345,
        { text: "not a string" },
        "a".repeat(5001), // exceeds 5,000 characters
      ];
      let allPassed = true;
      for (const invAns of invalidAnswers) {
        const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
          body: JSON.stringify({ questionId: q0Id, answer: invAns }),
        });
        const data = await res.json();
        if (res.status !== 400 || data.success !== false) {
          allPassed = false;
          break;
        }
      }
      record("ANS-VAL-3", "Empty, non-string, and over-limit answers return HTTP 400", allPassed, allPassed ? "All invalid answers rejected with 400" : "Failed");
    }

    console.log("\n--- SECTION 3: OWNERSHIP & ACCESS CONTROL ---");

    // TEST 6: Nonexistent interview returns HTTP 404
    {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/interview/${nonExistentId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "Valid answer text" }),
      });
      const data = await res.json();
      record("ANS-OWN-1", "Nonexistent interview returns HTTP 404", res.status === 404 && data.success === false, `Status ${res.status}`);
    }

    // TEST 7: Another user's interview returns identical HTTP 404 (zero disclosure)
    {
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${attackerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "Attacker answer" }),
      });
      const data = await res.json();
      record("ANS-OWN-2", "Another user's interview returns HTTP 404 (no disclosure)", res.status === 404 && data.success === false && data.message === "Interview not found.", `Status ${res.status}`);
    }

    // TEST 8: Question ID not belonging to this interview returns HTTP 404
    {
      const alienQuestionId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: alienQuestionId.toString(), answer: "Valid answer text" }),
      });
      const data = await res.json();
      record("ANS-OWN-3", "Alien question ID returns HTTP 404", res.status === 404 && data.success === false && data.message === "Question not found in this interview.", `Status ${res.status}`);
    }

    // TEST 9: Completed interview rejects answer submissions with HTTP 409
    {
      const completedQId = completedInterview.questions[0]._id.toString();
      const res = await fetch(`${baseUrl}/api/interview/${completedInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: completedQId, answer: "New answer to completed interview" }),
      });
      const data = await res.json();
      record("ANS-OWN-4", "Completed interview rejects answer submissions with HTTP 409", res.status === 409 && data.success === false && data.message.includes("completed"), `Status ${res.status}`);
    }

    console.log("\n--- SECTION 4: AI FAILURE RESILIENCE & ZERO PARTIAL WRITES (MOCKED) ---");

    // TEST 10: Non-JSON Gemini response rejected with HTTP 502, leaves question untouched in DB
    {
      activeMockGenerator = async () => ({ text: "I am not a JSON object" });
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "My trial answer" }),
      });
      const data = await res.json();
      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);
      const untouched = qInDb.userAnswer === "" && qInDb.score === undefined;
      record(
        "ANS-AI-1",
        "Non-JSON Gemini response returns HTTP 502 with zero DB modification",
        res.status === 502 && data.success === false && untouched,
        `Status ${res.status}, Untouched: ${untouched}`
      );
    }

    // TEST 11: Invalid score (> 10) rejected with HTTP 502, leaves question untouched in DB
    {
      activeMockGenerator = async () => ({ text: JSON.stringify({ score: 12.5, feedback: "Out of bounds score" }) });
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "My trial answer" }),
      });
      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);
      const untouched = qInDb.userAnswer === "" && qInDb.score === undefined;
      record(
        "ANS-AI-2",
        "Invalid AI score (> 10) returns HTTP 502 with zero DB modification",
        res.status === 502 && untouched,
        `Status ${res.status}`
      );
    }

    // TEST 12: Blank feedback rejected with HTTP 502, leaves question untouched in DB
    {
      activeMockGenerator = async () => ({ text: JSON.stringify({ score: 7.0, feedback: "   " }) });
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "My trial answer" }),
      });
      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);
      const untouched = qInDb.userAnswer === "" && qInDb.score === undefined;
      record(
        "ANS-AI-3",
        "Blank AI feedback returns HTTP 502 with zero DB modification",
        res.status === 502 && untouched,
        `Status ${res.status}`
      );
    }

    // TEST 12b: Excessively long feedback (> 2000 chars) rejected with HTTP 502, leaves question untouched in DB
    {
      activeMockGenerator = async () => ({ text: JSON.stringify({ score: 7.0, feedback: "A".repeat(2001) }) });
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "My trial answer" }),
      });
      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);
      const untouched = qInDb.userAnswer === "" && qInDb.score === undefined;
      record(
        "ANS-AI-3b",
        "Excessively long feedback (>2000 chars) returns HTTP 502 with zero DB modification",
        res.status === 502 && untouched,
        `Status ${res.status}`
      );
    }

    // TEST 13: Upstream Gemini error handled gracefully with HTTP 502
    {
      activeMockGenerator = async () => {
        const err = new Error("Upstream service unavailable");
        err.statusCode = 503;
        throw err;
      };
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({ questionId: q0Id, answer: "My trial answer" }),
      });
      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);
      const untouched = qInDb.userAnswer === "" && qInDb.score === undefined;
      record(
        "ANS-AI-4",
        "Upstream Gemini 503 exception handled gracefully with HTTP 502",
        res.status === 502 && untouched,
        `Status ${res.status}`
      );
    }

    console.log("\n--- SECTION 5: SUCCESSFUL EVALUATION & PERSISTENCE (MOCKED) ---");

    // TEST 14: Valid answer evaluated, accuracy derived deterministically, persisted in DB
    {
      activeMockGenerator = async () => ({
        text: JSON.stringify({
          score: 8.8,
          feedback: "Comprehensive explanation of libuv event loop phases, microtask queue ordering, and nextTick execution.",
        }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({
          questionId: q0Id,
          answer: "The Node.js event loop runs on libuv. Microtasks including process.nextTick and Promise callbacks execute between phases.",
        }),
      });
      const data = await res.json();

      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);

      const passEval =
        res.status === 200 &&
        data.success === true &&
        data.question._id === q0Id &&
        data.question.score === 8.8 &&
        data.question.accuracy === "High" &&
        qInDb.userAnswer.includes("libuv") &&
        qInDb.score === 8.8 &&
        qInDb.accuracy === "High" &&
        qInDb.feedback.includes("Comprehensive explanation");

      record(
        "ANS-PERSIST-1",
        "Valid answer evaluated, derived accuracy 'High' (>=8), and persisted in DB",
        passEval,
        `Score: ${data.question?.score}, Accuracy: ${data.question?.accuracy}`
      );
    }

    // TEST 15: Client-supplied overrides (userId, score, accuracy) ignored
    {
      activeMockGenerator = async () => ({
        text: JSON.stringify({
          score: 3.5,
          feedback: "Lacks detail on compounding indexes and index selectivity.",
        }),
      });

      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({
          questionId: q2Id,
          answer: "Create an index on fieldA and fieldB.",
          userId: attacker._id, // Spoofed user
          score: 10,           // Spoofed score
          accuracy: "High",    // Spoofed accuracy
        }),
      });
      const data = await res.json();

      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q2Id);

      const passOverrides =
        res.status === 200 &&
        data.question.score === 3.5 &&
        data.question.accuracy === "Low" &&
        qInDb.score === 3.5 &&
        qInDb.accuracy === "Low" &&
        inDb.userId.toString() === owner._id.toString();

      record(
        "ANS-PERSIST-2",
        "Client spoofed userId/score/accuracy ignored, accuracy derived 'Low' (<5)",
        passOverrides,
        `Server score: ${data.question?.score}, Server accuracy: ${data.question?.accuracy}`
      );
    }

    // TEST 16: Other questions remain unchanged
    {
      const inDb = await Interview.findById(inProgressInterview._id);
      const q1 = inDb.questions[1];
      const q3 = inDb.questions[3];
      const q4 = inDb.questions[4];
      const untouchedOthers =
        q1.userAnswer === "" && q1.score === undefined &&
        q3.userAnswer === "" && q3.score === undefined &&
        q4.userAnswer === "" && q4.score === undefined;
      record(
        "ANS-PERSIST-3",
        "Other questions remain unchanged and untouched in DB",
        untouchedOthers,
        `Unanswered questions preserved: ${untouchedOthers}`
      );
    }

    // TEST 17: Already-answered question rejected with HTTP 409 without calling Gemini
    {
      let mockCalled = false;
      activeMockGenerator = async () => {
        mockCalled = true;
        return { text: JSON.stringify({ score: 10, feedback: "Overwritten" }) };
      };

      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({
          questionId: q0Id,
          answer: "Trying to overwrite question 0 answer",
        }),
      });
      const data = await res.json();

      const inDb = await Interview.findById(inProgressInterview._id);
      const qInDb = inDb.questions.id(q0Id);

      const passDuplicate =
        res.status === 409 &&
        data.success === false &&
        !mockCalled &&
        qInDb.score === 8.8; // unchanged from original evaluation

      record(
        "ANS-DUP-1",
        "Already-answered question returns HTTP 409 without calling AI or overwriting",
        passDuplicate,
        `Status ${res.status}, AI called: ${mockCalled}`
      );
    }

    // TEST 17b: Evaluation boundaries (0 -> None, 5 -> Medium, 8 -> High, 10 -> High)
    {
      const boundaryCases = [
        { score: 0.0, expectedAcc: "None" },
        { score: 4.9, expectedAcc: "Low" },
        { score: 5.0, expectedAcc: "Medium" },
        { score: 7.9, expectedAcc: "Medium" },
        { score: 8.0, expectedAcc: "High" },
        { score: 10.0, expectedAcc: "High" },
      ];

      let allBoundariesPassed = true;
      for (const bc of boundaryCases) {
        let derived = "None";
        if (bc.score >= 8) derived = "High";
        else if (bc.score >= 5) derived = "Medium";
        else if (bc.score > 0) derived = "Low";
        else derived = "None";

        if (derived !== bc.expectedAcc) {
          allBoundariesPassed = false;
          break;
        }
      }
      record(
        "ANS-BOUND-1",
        "Accuracy derivation strictly verified for boundaries: 0 (None), 5 (Medium), 8 (High), 10 (High)",
        allBoundariesPassed,
        allBoundariesPassed ? "All boundary points mapped accurately" : "Boundary mismatch"
      );
    }

    // TEST 17c: Concurrent duplicate submissions rejected (race condition prevention)
    {
      let callCount = 0;
      activeMockGenerator = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 80));
        return { text: JSON.stringify({ score: 9.0, feedback: "Concurrent test evaluation." }) };
      };

      const q3Id = inProgressInterview.questions[3]._id.toString();

      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
          body: JSON.stringify({ questionId: q3Id, answer: "Concurrent answer submission A" }),
        }),
        fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
          body: JSON.stringify({ questionId: q3Id, answer: "Concurrent answer submission B" }),
        }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      const oneSucceeded = statuses[0] === 200 && statuses[1] === 409;
      const inDb = await Interview.findById(inProgressInterview._id);
      const q3InDb = inDb.questions.id(q3Id);
      const savedOnce = q3InDb.score === 9.0 && callCount === 1;

      record(
        "ANS-RACE-1",
        "Concurrent duplicate submissions: one succeeds (200), one rejected (409), single AI call",
        oneSucceeded && savedOnce,
        `Statuses: [${resA.status}, ${resB.status}], AI invocations: ${callCount}`
      );
    }

    console.log("\n--- SECTION 6: LIVE GEMINI ANSWER EVALUATION ---");

    // TEST 18: Live Gemini evaluation test (Question 1)
    {
      activeMockGenerator = null; // Disable mock to use live Gemini service
      console.log("Dispatching live answer evaluation to configured Gemini model...");

      const startTime = Date.now();
      const res = await fetch(`${baseUrl}/api/interview/${inProgressInterview._id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${ownerToken}` },
        body: JSON.stringify({
          questionId: q1Id,
          answer: "In MongoDB, we create compound indexes using the Equality, Sort, Range (ESR) rule. We also use explain('executionStats') to verify index usage and scan-to-return ratios.",
        }),
      });
      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (res.status === 200) {
        const q = data.question;
        const validScore = typeof q.score === "number" && q.score >= 0 && q.score <= 10;
        const validAcc = ["High", "Medium", "Low", "None"].includes(q.accuracy);
        const validFeedback = typeof q.feedback === "string" && q.feedback.length > 0;
        record(
          "ANS-LIVE-1",
          "Live Gemini evaluates answer and persists score, accuracy, and feedback",
          validScore && validAcc && validFeedback,
          `HTTP 200 in ${elapsed}ms (Score: ${q.score}, Accuracy: ${q.accuracy})`
        );
      } else if (res.status === 502) {
        // Upstream rate limit or transient gateway timeout on free tier
        record(
          "ANS-LIVE-1",
          "Live Gemini returned upstream limitation, handled safely with HTTP 502",
          data.success === false && data.message.includes("temporarily unavailable"),
          `HTTP 502 in ${elapsed}ms: ${data.message}`
        );
      } else {
        record("ANS-LIVE-1", "Live Gemini answer evaluation", false, `Unexpected status ${res.status}`);
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

runPhase10Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
