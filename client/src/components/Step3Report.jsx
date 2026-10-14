import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaPlus,
  FaAward,
  FaLightbulb,
} from "react-icons/fa";
import { BsRobot } from "react-icons/bs";

function Step3Report({ report }) {
  const navigate = useNavigate();

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading report...</p>
      </div>
    );
  }

  const {
    role = "Not specified",
    experience = "Not specified",
    interviewType = "technical",
    overallScore = 0,
    summaryFeedback = "",
    questions = [],
    createdAt,
  } = report;

  const scoreNum = typeof overallScore === "number" ? overallScore : 0;

  // Performance category description based on score
  let performanceTier = {
    title: "Needs Practice",
    desc: "Requires substantial improvement across technical and structured answer framing.",
    color: "text-red-600 bg-red-50 border-red-200",
  };

  if (scoreNum >= 8) {
    performanceTier = {
      title: "Strong Performance",
      desc: "Demonstrates exceptional technical depth, clarity, and structured responses.",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    };
  } else if (scoreNum >= 6) {
    performanceTier = {
      title: "Proficient",
      desc: "Solid foundational knowledge with minor gaps in elaboration or precision.",
      color: "text-blue-700 bg-blue-50 border-blue-200",
    };
  } else if (scoreNum >= 4) {
    performanceTier = {
      title: "Developing",
      desc: "Basic understanding demonstrated; practice structuring answers with the STAR or principles-first method.",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }

  const getAccuracyBadge = (accuracy) => {
    switch (accuracy) {
      case "High":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Low":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently completed";

  return (
    <div className="min-h-screen bg-[#f3f3f3] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition cursor-pointer"
          >
            <FaArrowLeft size={12} />
            <span>Back to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/interview")}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <FaPlus size={12} />
            <span>Start Another Interview</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1.5">
              <FaCheckCircle size={12} />
              <span>Completed Interview</span>
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">
              {formattedDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
            Performance Report: {role}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mt-2">
            <span className="bg-gray-100 px-3 py-1 rounded-md font-medium">
              Experience: {experience}
            </span>
            <span className="bg-gray-100 px-3 py-1 rounded-md font-medium capitalize">
              Track: {interviewType === "technical" ? "Technical" : "HR & Behavioral"}
            </span>
            <span className="bg-gray-100 px-3 py-1 rounded-md font-medium">
              5 Questions Evaluated
            </span>
          </div>
        </div>

        {/* Score & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Overall Score Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-6">
                Overall Evaluation Score
              </p>

              {/* Large Score Circle */}
              <div className="w-36 h-36 mx-auto rounded-full bg-linear-to-b from-gray-50 to-emerald-50 border-4 border-emerald-500 flex flex-col items-center justify-center shadow-inner mb-6">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
                  {scoreNum.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 font-medium mt-0.5">
                  out of 10
                </span>
              </div>

              {/* Performance Tier Badge */}
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium mb-4 ${performanceTier.color}`}
              >
                <div className="font-bold mb-1 flex items-center justify-center gap-1.5">
                  <FaAward size={14} />
                  <span>{performanceTier.title}</span>
                </div>
                <p className="leading-relaxed text-xs opacity-90">
                  {performanceTier.desc}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Arithmetic mean across all 5 evaluated questions
            </p>
          </div>

          {/* AI Executive Summary Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-gray-900">
                <BsRobot size={20} className="text-green-600" />
                <h2 className="text-lg font-bold">Executive Feedback & Insights</h2>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {summaryFeedback || "No overall feedback was generated for this session."}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <FaLightbulb className="text-amber-500" />
              <span>Review each individual question evaluation below to pinpoint targeted improvements.</span>
            </div>
          </div>
        </div>

        {/* Question-by-Question Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Question-by-Question Breakdown
            </h2>
            <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
              5 Questions
            </span>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div
                key={q._id || idx}
                className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5"
              >
                {/* Header row with Question Index and Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Question {idx + 1} of 5
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${getAccuracyBadge(
                        q.accuracy
                      )}`}
                    >
                      Accuracy: {q.accuracy || "Not assessed"}
                    </span>
                    <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full">
                      {typeof q.score === "number" ? q.score : 0} / 10
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                    {q.question}
                  </h3>
                </div>

                {/* Candidate's Submitted Answer */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Your Submitted Answer
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {q.userAnswer && q.userAnswer.trim()
                      ? q.userAnswer
                      : "(No answer provided)"}
                  </div>
                </div>

                {/* AI Constructive Feedback */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2 flex items-center gap-1.5">
                    <BsRobot size={14} />
                    <span>AI Feedback & Strengths</span>
                  </p>
                  <div className="bg-green-50/60 border border-green-200 rounded-2xl p-4 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                    {q.feedback && q.feedback.trim()
                      ? q.feedback
                      : "No feedback recorded for this question."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-black text-white rounded-3xl p-8 sm:p-10 text-center shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Continue Your Interview Preparation
          </h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">
            Practice makes perfect. Simulate another mock interview with different
            roles, levels, or interview modes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="bg-white text-black px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-100 transition cursor-pointer"
            >
              Start Another Interview
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="border border-gray-600 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-900 transition cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step3Report;
