import { useState, useRef } from "react";
import {
  FaCheckCircle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaRedo,
  FaCheck,
  FaAward,
} from "react-icons/fa";
import { BsRobot } from "react-icons/bs";
import api from "../services/api";

const MAX_ANSWER_LENGTH = 5000;

function Step2Interview({
  interview,
  onAnswerSubmitted,
  onCompleteInterview,
  completing,
  completionError,
}) {
  const { _id, role, experience, interviewType, questions = [] } = interview;

  // Determine initial question index: first unanswered question, or 0
  const initialIndex = questions.findIndex(
    (q) => q.score === undefined || !q.userAnswer
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0
  );

  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const inFlightRef = useRef(false);

  const currentQuestion = questions[currentIndex] || {};
  const isCurrentEvaluated =
    currentQuestion.score !== undefined &&
    currentQuestion.userAnswer &&
    currentQuestion.userAnswer.trim().length > 0;

  const activeDraft = drafts[currentQuestion._id] ?? "";

  // Count evaluated questions
  const evaluatedCount = questions.filter(
    (q) =>
      q.score !== undefined &&
      typeof q.userAnswer === "string" &&
      q.userAnswer.trim().length > 0
  ).length;

  const allQuestionsEvaluated = evaluatedCount === 5;

  const handleSelectQuestion = (idx) => {
    setCurrentIndex(idx);
    setSubmitError("");
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();

    if (inFlightRef.current || submitting) return;

    const trimmed = activeDraft.trim();
    if (!trimmed) {
      setSubmitError("Please provide an answer before submitting for evaluation.");
      return;
    }

    if (trimmed.length > MAX_ANSWER_LENGTH) {
      setSubmitError(
        `Answer cannot exceed ${MAX_ANSWER_LENGTH} characters. Currently ${trimmed.length}.`
      );
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await api.post(`/api/interview/${_id}/answer`, {
        questionId: currentQuestion._id,
        answer: trimmed,
      });

      if (response.data && response.data.success && response.data.question) {
        onAnswerSubmitted(response.data.question);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[currentQuestion._id];
          return next;
        });
        setSubmitError("");

        // Advance to next unanswered question if one exists
        const nextUnanswered = questions.findIndex(
          (q, idx) =>
            idx !== currentIndex &&
            (q.score === undefined || !q.userAnswer)
        );
        if (nextUnanswered !== -1) {
          handleSelectQuestion(nextUnanswered);
        }
      } else {
        setSubmitError(
          response.data?.message || "Failed to evaluate answer. Please try again."
        );
      }
    } catch (error) {
      console.error("Answer submission error:", error?.message || "Unknown error");
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 409) {
        // Conflict: already answered or in-flight
        setSubmitError(
          backendMessage ||
            "This question has already been answered. Re-syncing state..."
        );
      } else if (status === 502) {
        setSubmitError(
          backendMessage ||
            "The AI evaluation service is temporarily unavailable. Your answer has been preserved. Please click retry."
        );
      } else if (status === 400) {
        setSubmitError(backendMessage || "Invalid answer submission.");
      } else {
        setSubmitError(
          backendMessage ||
            "Network error during evaluation. Your answer has been preserved. Please retry."
        );
      }
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Session Progress Header */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                Active Interview
              </span>
              <span className="text-xs text-gray-500 font-medium capitalize">
                {interviewType === "technical" ? "Technical Track" : "HR & Behavioral Track"}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
              {role} <span className="text-gray-400 font-normal">({experience})</span>
            </h1>
          </div>

          <div className="text-right sm:self-center">
            <span className="text-xs font-semibold text-gray-500 block">
              Evaluated Progress
            </span>
            <span className="text-sm font-bold text-gray-900">
              {evaluatedCount} of 5 Answered
            </span>
          </div>
        </div>

        {/* 5-Segment Progress Bar */}
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            const isEvaluated = q.score !== undefined && q.userAnswer;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q._id || idx}
                type="button"
                onClick={() => handleSelectQuestion(idx)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isCurrent
                    ? "ring-2 ring-black bg-black text-white"
                    : isEvaluated
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>Q{idx + 1}</span>
                {isEvaluated && <FaCheck size={10} className="text-green-700" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question & Answer Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Question Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Question {currentIndex + 1} of 5
          </span>

          {isCurrentEvaluated && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getAccuracyBadge(
                  currentQuestion.accuracy
                )}`}
              >
                Accuracy: {currentQuestion.accuracy}
              </span>
              <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full">
                {currentQuestion.score} / 10
              </span>
            </div>
          )}
        </div>

        {/* Question Prompt */}
        <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed">
            {currentQuestion.question || "Loading question..."}
          </h2>
        </div>

        {/* Answer Section */}
        {isCurrentEvaluated ? (
          /* Case A: Already Evaluated -> Display Saved Answer & Feedback */
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Your Submitted Answer
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {currentQuestion.userAnswer}
              </div>
            </div>

            {/* AI Evaluation Box */}
            <div className="bg-green-50/60 border border-green-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                  <BsRobot size={18} className="text-green-600" />
                  <span>AI Evaluation Feedback</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-green-800">
                  <FaAward size={13} />
                  <span>Score: {currentQuestion.score}/10</span>
                </div>
              </div>

              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {currentQuestion.feedback}
              </p>
            </div>
          </div>
        ) : (
          /* Case B: Not Evaluated -> Editable Answer Form */
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div>
              <label
                htmlFor="answerInput"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2"
              >
                Type Your Answer
              </label>
              <textarea
                id="answerInput"
                rows={7}
                placeholder="Type your answer clearly. Explain your technical reasoning, specific principles, or practical examples..."
                value={activeDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  setDrafts((prev) => ({
                    ...prev,
                    [currentQuestion._id]: val,
                  }));
                }}
                maxLength={MAX_ANSWER_LENGTH}
                disabled={submitting}
                className="w-full p-4 border border-gray-200 rounded-2xl text-sm sm:text-base leading-relaxed focus:border-black focus:ring-1 focus:ring-black outline-none transition font-sans resize-y disabled:bg-gray-100"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Provide a thorough, structured explanation</span>
                <span>
                  {activeDraft.length}/{MAX_ANSWER_LENGTH}
                </span>
              </div>
            </div>

            {/* Submission Error Banner with Retry */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-start justify-between gap-3">
                <span>{submitError}</span>
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !activeDraft.trim()}
                  className="font-bold underline shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <FaRedo size={12} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !activeDraft.trim()}
              className="w-full bg-black hover:bg-gray-800 text-white py-3.5 rounded-full font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Evaluating Answer with AI...</span>
                </>
              ) : (
                <span>Submit Answer for Evaluation</span>
              )}
            </button>
          </form>
        )}

        {/* Question Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleSelectQuestion(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-black border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FaArrowLeft size={12} />
            <span>Previous</span>
          </button>

          <span className="text-xs text-gray-400">
            {isCurrentEvaluated ? "Answer evaluated" : "Answer pending"}
          </span>

          <button
            type="button"
            onClick={() =>
              handleSelectQuestion(Math.min(questions.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === questions.length - 1}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-black border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span>Next</span>
            <FaArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Completion Banner (shown when all 5 questions evaluated) */}
      {allQuestionsEvaluated && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl">
            <FaCheckCircle />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
              All 5 Questions Evaluated!
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800 mt-1 max-w-md mx-auto">
              Every question has a verified answer and score. Complete the session to
              generate your final performance report.
            </p>
          </div>

          {completionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm max-w-md mx-auto">
              {completionError}
            </div>
          )}

          <button
            type="button"
            onClick={onCompleteInterview}
            disabled={completing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 py-3.5 rounded-full font-bold transition shadow-sm cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-2 text-sm sm:text-base"
          >
            {completing ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Generating Comprehensive Report...</span>
              </>
            ) : (
              <span>Complete Interview & View Final Report</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default Step2Interview;
