import mongoose from "mongoose";
import Interview from "../models/Interview.js";
import User from "../models/user.model.js";

async function runTests() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — PHASE 7: INTERVIEW MODEL VALIDATION     ");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  const assertTest = (name, condition, details = "") => {
    if (condition) {
      console.log(`[PASS] ${name}${details ? " - " + details : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? " - " + details : ""}`);
      failed++;
    }
  };

  const createFiveQuestions = () => [
    { question: "Explain event loop in Node.js." },
    { question: "How does React fiber architecture work?" },
    { question: "What is the difference between SQL and NoSQL databases?" },
    { question: "How do you handle JWT authentication securely?" },
    { question: "Describe a complex distributed systems bug you resolved." },
  ];

  // 1. Valid 5-question interview document passes schema validation
  try {
    const validDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Full Stack Engineer",
      experience: "3-5 years",
      interviewType: "technical",
      resumeSkills: ["JavaScript", "React", "Node.js", "MongoDB"],
      questions: createFiveQuestions(),
    });

    await validDoc.validate();
    assertTest("TEST 1: Valid 5-question interview passes schema validation", true);
    assertTest(
      "TEST 1b: Default values initialized correctly",
      validDoc.status === "in_progress" &&
        validDoc.summaryFeedback === "" &&
        validDoc.overallScore === undefined &&
        validDoc.questions[0].userAnswer === "" &&
        validDoc.questions[0].score === undefined &&
        validDoc.questions[0].accuracy === undefined &&
        validDoc.questions[0].feedback === "",
      `status='${validDoc.status}', summaryFeedback='${validDoc.summaryFeedback}'`
    );
  } catch (err) {
    assertTest("TEST 1: Valid 5-question interview passes schema validation", false, err.message);
  }

  // 2. Missing required fields are rejected
  try {
    const emptyDoc = new Interview({});
    let validationErr = null;
    try {
      await emptyDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    const hasRequiredErrors =
      validationErr &&
      validationErr.errors["userId"] &&
      validationErr.errors["role"] &&
      validationErr.errors["experience"] &&
      validationErr.errors["interviewType"] &&
      validationErr.errors["questions"];
    assertTest("TEST 2: Missing required root fields rejected", Boolean(hasRequiredErrors));
  } catch (err) {
    assertTest("TEST 2: Missing required root fields rejected", false, err.message);
  }

  // 3. Invalid interviewType rejected
  try {
    const invalidTypeDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Backend Engineer",
      experience: "2 years",
      interviewType: "behavioral", // Invalid enum
      questions: createFiveQuestions(),
    });
    let validationErr = null;
    try {
      await invalidTypeDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 3: Invalid interviewType ('behavioral') rejected",
      Boolean(validationErr?.errors["interviewType"])
    );
  } catch (err) {
    assertTest("TEST 3: Invalid interviewType rejected", false, err.message);
  }

  // 4. Valid interviewType 'hr' and 'technical' accepted
  try {
    const hrDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Engineering Manager",
      experience: "7+ years",
      interviewType: "hr",
      questions: createFiveQuestions(),
    });
    await hrDoc.validate();
    assertTest("TEST 4: Valid interviewType ('hr') passes", hrDoc.interviewType === "hr");
  } catch (err) {
    assertTest("TEST 4: Valid interviewType ('hr') passes", false, err.message);
  }

  // 5. Zero questions rejected
  try {
    const zeroQDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [],
    });
    let validationErr = null;
    try {
      await zeroQDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 5: Questions array with 0 items rejected",
      Boolean(validationErr?.errors["questions"])
    );
  } catch (err) {
    assertTest("TEST 5: Questions array with 0 items rejected", false, err.message);
  }

  // 6. Fewer than 5 questions rejected (e.g. 4 questions)
  try {
    const fourQDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: createFiveQuestions().slice(0, 4),
    });
    let validationErr = null;
    try {
      await fourQDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 6: Fewer than 5 questions (4 items) rejected",
      Boolean(validationErr?.errors["questions"])
    );
  } catch (err) {
    assertTest("TEST 6: Fewer than 5 questions rejected", false, err.message);
  }

  // 7. More than 5 questions rejected (e.g. 6 questions)
  try {
    const sixQDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [...createFiveQuestions(), { question: "Extra question 6" }],
    });
    let validationErr = null;
    try {
      await sixQDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 7: More than 5 questions (6 items) rejected",
      Boolean(validationErr?.errors["questions"])
    );
  } catch (err) {
    assertTest("TEST 7: More than 5 questions rejected", false, err.message);
  }

  // 8. Question subdocument missing question text rejected
  try {
    const missingQTextDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "" },
        ...createFiveQuestions().slice(1),
      ],
    });
    let validationErr = null;
    try {
      await missingQTextDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 8: Subdocument with missing question text rejected",
      Boolean(validationErr?.errors["questions.0.question"])
    );
  } catch (err) {
    assertTest("TEST 8: Subdocument with missing question text rejected", false, err.message);
  }

  // 9. Question subdocument invalid accuracy rejected
  try {
    const invalidAccuracyDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "Q1", accuracy: "InvalidAccuracy" },
        ...createFiveQuestions().slice(1),
      ],
    });
    let validationErr = null;
    try {
      await invalidAccuracyDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 9: Subdocument with invalid accuracy ('InvalidAccuracy') rejected",
      Boolean(validationErr?.errors["questions.0.accuracy"])
    );
  } catch (err) {
    assertTest("TEST 9: Subdocument with invalid accuracy rejected", false, err.message);
  }

  // 10. Question subdocument valid accuracy values ('High', 'Medium', 'Low', 'None') accepted
  try {
    const validAccDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "Q1", accuracy: "High" },
        { question: "Q2", accuracy: "Medium" },
        { question: "Q3", accuracy: "Low" },
        { question: "Q4", accuracy: "None" },
        { question: "Q5" },
      ],
    });
    await validAccDoc.validate();
    assertTest("TEST 10: Subdocument valid accuracy values ('High', 'Medium', 'Low', 'None') pass", true);
  } catch (err) {
    assertTest("TEST 10: Subdocument valid accuracy values pass", false, err.message);
  }

  // 11. Question subdocument invalid score values (< 0 or > 10) rejected; valid boundaries (0, 10) pass
  try {
    const invalidScoreDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "Q1", score: 11 },
        ...createFiveQuestions().slice(1),
      ],
    });
    let validationErr = null;
    try {
      await invalidScoreDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 11a: Subdocument score > 10 rejected",
      Boolean(validationErr?.errors["questions.0.score"])
    );

    const negativeScoreDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "Q1", score: -1 },
        ...createFiveQuestions().slice(1),
      ],
    });
    validationErr = null;
    try {
      await negativeScoreDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 11b: Subdocument score < 0 rejected",
      Boolean(validationErr?.errors["questions.0.score"])
    );

    const boundaryScoreDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      questions: [
        { question: "Q1", score: 0 },
        { question: "Q2", score: 10 },
        { question: "Q3", score: 7.5 },
        ...createFiveQuestions().slice(3),
      ],
    });
    await boundaryScoreDoc.validate();
    assertTest("TEST 11c: Subdocument valid boundary scores (0, 7.5, 10) pass", true);
  } catch (err) {
    assertTest("TEST 11: Subdocument score bounds rejected", false, err.message);
  }

  // 12. Invalid overallScore bounds (< 0 or > 10) rejected; valid boundaries (0, 10) pass
  try {
    const invalidOverallDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      overallScore: 11,
      questions: createFiveQuestions(),
    });
    let validationErr = null;
    try {
      await invalidOverallDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 12a: overallScore > 10 rejected",
      Boolean(validationErr?.errors["overallScore"])
    );

    const negativeOverallDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      overallScore: -1,
      questions: createFiveQuestions(),
    });
    validationErr = null;
    try {
      await negativeOverallDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 12b: overallScore < 0 rejected",
      Boolean(validationErr?.errors["overallScore"])
    );

    const boundaryOverallDoc0 = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      overallScore: 0,
      questions: createFiveQuestions(),
    });
    await boundaryOverallDoc0.validate();

    const boundaryOverallDoc10 = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      overallScore: 10,
      questions: createFiveQuestions(),
    });
    await boundaryOverallDoc10.validate();

    assertTest("TEST 12c: overallScore valid boundary values (0, 10) pass", true);
  } catch (err) {
    assertTest("TEST 12: overallScore bounds rejected", false, err.message);
  }

  // 13. Invalid status rejected
  try {
    const invalidStatusDoc = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Frontend Engineer",
      experience: "Junior",
      interviewType: "technical",
      status: "invalid_status",
      questions: createFiveQuestions(),
    });
    let validationErr = null;
    try {
      await invalidStatusDoc.validate();
    } catch (e) {
      validationErr = e;
    }
    assertTest(
      "TEST 13: Invalid status rejected",
      Boolean(validationErr?.errors["status"])
    );
  } catch (err) {
    assertTest("TEST 13: Invalid status rejected", false, err.message);
  }

  // 14. Answer updates on existing interview pass validation
  try {
    const interview = new Interview({
      userId: new mongoose.Types.ObjectId(),
      role: "Full Stack Engineer",
      experience: "Senior",
      interviewType: "technical",
      questions: createFiveQuestions(),
    });
    await interview.validate();

    // Simulate answering question 1
    interview.questions[0].userAnswer = "Event loop processes async callbacks via libuv.";
    interview.questions[0].score = 9.5;
    interview.questions[0].accuracy = "High";
    interview.questions[0].feedback = "Clear, accurate answer.";
    await interview.validate();

    // Simulate completing interview
    interview.status = "completed";
    interview.overallScore = 8.8;
    interview.summaryFeedback = "Candidate demonstrated strong engineering fundamentals.";
    await interview.validate();

    assertTest("TEST 14: Answer updates and completion lifecycle pass validation", true);
  } catch (err) {
    assertTest("TEST 14: Answer updates and completion lifecycle pass validation", false, err.message);
  }

  // 15. Timestamps enabled on schema
  const hasTimestamps = Boolean(Interview.schema.options.timestamps);
  assertTest("TEST 15: Timestamps enabled on Interview schema", hasTimestamps);

  // 16. Existing User model reference resolves correctly
  const userIdPath = Interview.schema.path("userId");
  const refModelName = userIdPath.options.ref;
  const userModelRegistered = mongoose.models[refModelName] === User;
  assertTest(
    "TEST 16: userId references the 'User' model matching user.model.js",
    refModelName === "User" && userModelRegistered,
    `ref='${refModelName}', matched User model: ${userModelRegistered}`
  );

  console.log("\n=========================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
