import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserTie,
  FaBriefcase,
  FaCode,
  FaUserCheck,
  FaSpinner,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import api from "../services/api";
import ResumeUpload from "./ResumeUpload.jsx";

const MAX_ROLE_LENGTH = 150;
const MAX_EXPERIENCE_LENGTH = 100;
const MAX_SKILLS_COUNT = 50;

function InterviewSetup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [interviewType, setInterviewType] = useState("technical");
  const [skills, setSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const inFlightRef = useRef(false);

  const handleResumeAnalysisSuccess = (analysis) => {
    if (!analysis) return;

    if (analysis.skills && Array.isArray(analysis.skills)) {
      setSkills((prev) => {
        const merged = Array.from(new Set([...prev, ...analysis.skills]));
        return merged.slice(0, MAX_SKILLS_COUNT);
      });
    }

    if (!role && analysis.recommendedRoles && analysis.recommendedRoles.length > 0) {
      setRole(analysis.recommendedRoles[0]);
    }
  };

  const handleRoleSelect = (roleName) => {
    if (roleName) {
      setRole(roleName.slice(0, MAX_ROLE_LENGTH));
    }
  };

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;

    if (skills.length >= MAX_SKILLS_COUNT) {
      setFormError(`You can include up to ${MAX_SKILLS_COUNT} skills.`);
      return;
    }

    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (indexToRemove) => {
    setSkills(skills.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (inFlightRef.current || submitting) return;

    setFormError("");

    // Client-side validations matching backend constraints
    const trimmedRole = role.trim();
    if (!trimmedRole) {
      setFormError("Target job role is required.");
      return;
    }
    if (trimmedRole.length > MAX_ROLE_LENGTH) {
      setFormError(`Target job role cannot exceed ${MAX_ROLE_LENGTH} characters.`);
      return;
    }

    const trimmedExperience = experience.trim();
    if (!trimmedExperience) {
      setFormError("Experience level is required.");
      return;
    }
    if (trimmedExperience.length > MAX_EXPERIENCE_LENGTH) {
      setFormError(
        `Experience description cannot exceed ${MAX_EXPERIENCE_LENGTH} characters.`
      );
      return;
    }

    if (interviewType !== "technical" && interviewType !== "hr") {
      setFormError("Interview type must be either 'technical' or 'hr'.");
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);

    const payload = {
      role: trimmedRole,
      experience: trimmedExperience,
      interviewType,
      resumeSkills: skills.length > 0 ? skills : undefined,
    };

    try {
      const response = await api.post("/api/interview/create", payload);

      if (response.data && response.data.success && response.data.interview) {
        const interviewId = response.data.interview._id;
        navigate(`/interview/${interviewId}`, {
          state: { interview: response.data.interview },
        });
      } else {
        setFormError(
          response.data?.message ||
            "Unable to generate interview. Please try again."
        );
      }
    } catch (error) {
      console.error("Interview creation error:", error?.message || "Unknown error");
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 401) {
        setFormError("Your session has expired. Please log in again.");
        navigate("/auth", { state: { from: { pathname: "/interview" } } });
      } else if (status === 400) {
        setFormError(backendMessage || "Invalid interview parameters.");
      } else if (status === 502) {
        setFormError(
          backendMessage ||
            "The AI question generator is temporarily unavailable. Please retry."
        );
      } else {
        setFormError(
          backendMessage ||
            "An error occurred while creating your interview. Please check your connection and retry."
        );
      }
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Interview Setup
        </h2>
        <p className="text-gray-500 text-sm sm:text-base mt-2">
          Configure your mock interview parameters or upload a resume to tailor
          questions to your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step A: Resume Upload (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            1. Resume Analysis (Optional)
          </label>
          <ResumeUpload
            onAnalysisSuccess={handleResumeAnalysisSuccess}
            onRoleSelect={handleRoleSelect}
          />
        </div>

        {/* Step B: Target Role */}
        <div>
          <label
            htmlFor="targetRole"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            2. Target Job Role <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FaUserTie className="absolute top-4 left-4 text-gray-400" />
            <input
              id="targetRole"
              type="text"
              placeholder="e.g. Senior Full Stack Engineer, Frontend Developer"
              maxLength={MAX_ROLE_LENGTH}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={submitting}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm sm:text-base focus:border-black focus:ring-1 focus:ring-black outline-none transition disabled:bg-gray-100"
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>The position you are interviewing for</span>
            <span>
              {role.length}/{MAX_ROLE_LENGTH}
            </span>
          </div>
        </div>

        {/* Step C: Experience Level */}
        <div>
          <label
            htmlFor="experienceLevel"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            3. Experience Level <span className="text-red-500">*</span>
          </label>
          <div className="relative mb-2">
            <FaBriefcase className="absolute top-4 left-4 text-gray-400" />
            <input
              id="experienceLevel"
              type="text"
              placeholder="e.g. 2 years, Entry-level (0-1 yrs), Senior 5+ years"
              maxLength={MAX_EXPERIENCE_LENGTH}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              disabled={submitting}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm sm:text-base focus:border-black focus:ring-1 focus:ring-black outline-none transition disabled:bg-gray-100"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-gray-400 self-center">Presets:</span>
            {[
              "Entry-level (0-1 yrs)",
              "Junior (1-2 yrs)",
              "Mid-level (3-5 yrs)",
              "Senior (5+ yrs)",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setExperience(preset)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Step D: Interview Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            4. Interview Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInterviewType("technical")}
              disabled={submitting}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                interviewType === "technical"
                  ? "border-black bg-black text-white shadow-xs"
                  : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
              }`}
            >
              <FaCode className="mt-1 shrink-0 text-lg" />
              <div>
                <p className="font-semibold text-sm">Technical</p>
                <p
                  className={`text-xs mt-0.5 ${
                    interviewType === "technical"
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  Architecture, coding, domain depth
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInterviewType("hr")}
              disabled={submitting}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                interviewType === "hr"
                  ? "border-black bg-black text-white shadow-xs"
                  : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
              }`}
            >
              <FaUserCheck className="mt-1 shrink-0 text-lg" />
              <div>
                <p className="font-semibold text-sm">HR & Behavioral</p>
                <p
                  className={`text-xs mt-0.5 ${
                    interviewType === "hr" ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  Communication, STAR method
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step E: Skills Tags (Optional / populated by resume) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            5. Focus Skills (Optional)
          </label>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add skill tag (e.g. React, Node.js, System Design)"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-black outline-none"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              disabled={submitting || !newSkillInput.trim()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <FaPlus size={12} />
              <span>Add</span>
            </button>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl max-h-36 overflow-y-auto">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-white border border-gray-200 text-gray-800 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(index)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <FaTimes size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {formError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !role.trim() || !experience.trim()}
          className="w-full bg-black hover:bg-gray-800 text-white py-3.5 rounded-full font-semibold transition duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Generating 5 Tailored Questions...</span>
            </>
          ) : (
            <span>Create & Start Interview</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default InterviewSetup;
