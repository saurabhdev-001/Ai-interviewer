import { useState, useRef } from "react";
import {
  FaFileUpload,
  FaFilePdf,
  FaCheckCircle,
  FaTimes,
  FaRedo,
  FaSpinner,
} from "react-icons/fa";
import api from "../services/api";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function ResumeUpload({ onAnalysisSuccess, onRoleSelect }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);
  const inFlightRef = useRef(false);

  const validateAndSetFile = (selectedFile) => {
    setUploadError("");
    setAnalysisResult(null);

    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setUploadError("Only PDF files are supported. Please select a .pdf file.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File size exceeds the 5 MB limit. Please select a smaller PDF.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    validateAndSetFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnalyze = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!file || inFlightRef.current || analyzing) return;

    inFlightRef.current = true;
    setAnalyzing(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await api.post("/api/resume/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success && response.data.analysis) {
        setAnalysisResult(response.data.analysis);
        if (onAnalysisSuccess) {
          onAnalysisSuccess(response.data.analysis);
        }
      } else {
        setUploadError("Failed to extract details from the resume. Please try again.");
      }
    } catch (error) {
      console.error("Resume analysis error:", error?.message || "Unknown error");
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 413) {
        setUploadError("File size exceeds the 5 MB limit.");
      } else if (status === 422) {
        setUploadError(
          backendMessage ||
            "No readable text could be extracted from the PDF. Scanned images and empty documents are not supported."
        );
      } else if (status === 400) {
        setUploadError(
          backendMessage || "Invalid PDF file or format. Please upload a valid PDF."
        );
      } else if (status === 502) {
        setUploadError(
          backendMessage ||
            "The AI analysis service is temporarily unavailable. Please try again shortly."
        );
      } else {
        setUploadError(
          backendMessage ||
            "Network or server error while analyzing resume. Please retry."
        );
      }
    } finally {
      inFlightRef.current = false;
      setAnalyzing(false);
    }
  };

  const handleRemoveFile = (e) => {
    if (e) e.stopPropagation();
    setFile(null);
    setAnalysisResult(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* File Drop Area */}
      {!analysisResult && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            uploadError
              ? "border-red-300 bg-red-50/40"
              : file
              ? "border-green-500 bg-green-50/30"
              : "border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FaFilePdf className="text-4xl text-green-600 mb-2" />
              <p className="font-semibold text-gray-800 text-sm sm:text-base break-all max-w-full">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="bg-black hover:bg-gray-800 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:bg-gray-400"
                >
                  {analyzing ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Analyzing with AI...</span>
                    </>
                  ) : (
                    <span>Analyze Resume</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={analyzing}
                  className="text-gray-500 hover:text-red-600 text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 transition cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 mb-3">
                <FaFileUpload className="text-xl" />
              </div>
              <p className="font-medium text-gray-800 text-sm sm:text-base">
                Click to upload resume or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF documents up to 5 MB (Optional)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start justify-between gap-3">
          <span>{uploadError}</span>
          {file && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-red-700 hover:text-red-900 font-semibold underline shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <FaRedo size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Analysis Result Display */}
      {analysisResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-green-700">
              <FaCheckCircle />
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                Resume Analyzed Successfully
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
            >
              <FaTimes size={12} />
              <span>Upload Different Resume</span>
            </button>
          </div>

          {analysisResult.summary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Candidate Summary
              </p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                {analysisResult.summary}
              </p>
            </div>
          )}

          {analysisResult.recommendedRoles &&
            analysisResult.recommendedRoles.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Recommended Roles (Click to auto-fill)
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.recommendedRoles.map((roleName, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onRoleSelect && onRoleSelect(roleName)}
                      className="bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-medium px-3 py-1.5 rounded-full transition cursor-pointer"
                    >
                      + {roleName}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {analysisResult.skills && analysisResult.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Extracted Skills ({analysisResult.skills.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {analysisResult.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-md border border-gray-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;
