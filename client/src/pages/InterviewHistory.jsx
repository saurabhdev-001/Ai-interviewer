import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaRedo,
  FaExclamationTriangle,
  FaBriefcase,
  FaClock,
  FaCheckCircle,
  FaHourglassHalf,
  FaPlus,
} from "react-icons/fa";
import api from "../services/api";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function InterviewHistory() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [pagination, setPagination] = useState({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const inFlightRef = useRef(false);

  // Fetch interviews for a specific page
  const fetchHistory = useCallback(async (targetPage = page) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/interview/history?page=${targetPage}&limit=${DEFAULT_LIMIT}`
      );

      if (response.data && response.data.success) {
        setInterviews(response.data.interviews || []);
        const meta = response.data.pagination || {};
        const parsedPage = Number(meta.page) || targetPage;
        const parsedTotal = Number(meta.total) || 0;
        const parsedTotalPages =
          Number(meta.totalPages) ||
          (parsedTotal > 0 ? Math.ceil(parsedTotal / DEFAULT_LIMIT) : 0);

        setPagination({
          page: parsedPage,
          limit: Number(meta.limit) || DEFAULT_LIMIT,
          total: parsedTotal,
          totalPages: parsedTotalPages,
        });

        // If user was on a page that is now greater than totalPages, adjust safely
        if (parsedTotalPages > 0 && parsedPage > parsedTotalPages) {
          setPage(parsedTotalPages);
        }
      } else {
        setError("Unable to retrieve interview history.");
      }
    } catch (err) {
      console.error("Fetch history error:", err?.message || "Unknown error");
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 401) {
        setError("Authentication required to view interview history.");
      } else {
        setError(
          backendMessage ||
            "Unable to connect to the server. Please check your internet connection."
        );
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [page]);

  // Initial load and page changes
  useEffect(() => {
    let ignore = false;
    inFlightRef.current = true;

    api
      .get(`/api/interview/history?page=${page}&limit=${DEFAULT_LIMIT}`)
      .then((response) => {
        if (ignore) return;
        if (response.data && response.data.success) {
          setInterviews(response.data.interviews || []);
          const meta = response.data.pagination || {};
          const parsedPage = Number(meta.page) || page;
          const parsedTotal = Number(meta.total) || 0;
          const parsedTotalPages =
            Number(meta.totalPages) ||
            (parsedTotal > 0 ? Math.ceil(parsedTotal / DEFAULT_LIMIT) : 0);

          setPagination({
            page: parsedPage,
            limit: Number(meta.limit) || DEFAULT_LIMIT,
            total: parsedTotal,
            totalPages: parsedTotalPages,
          });

          if (parsedTotalPages > 0 && parsedPage > parsedTotalPages) {
            setPage(parsedTotalPages);
          }
        } else {
          setError("Unable to retrieve interview history.");
        }
      })
      .catch((err) => {
        if (ignore) return;
        const status = err?.response?.status;
        const backendMessage = err?.response?.data?.message;

        if (status === 401) {
          setError("Authentication required to view interview history.");
        } else {
          setError(
            backendMessage ||
              "Unable to connect to the server. Please check your internet connection."
          );
        }
      })
      .finally(() => {
        inFlightRef.current = false;
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [page]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) return;
    if (loading || inFlightRef.current) return;
    setPage(newPage);
  };

  const handleRetry = () => {
    fetchHistory(page);
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return "Date unavailable";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Date unavailable";
    }
  };

  // Score tier color helper
  const getScoreBadge = (score) => {
    if (score === null || score === undefined) return null;
    const num = Number(score);
    if (num >= 8) {
      return {
        label: "Excellent",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    }
    if (num >= 6) {
      return {
        label: "Proficient",
        className: "bg-blue-50 text-blue-800 border-blue-200",
      };
    }
    if (num >= 4) {
      return {
        label: "Developing",
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }
    return {
      label: "Needs Practice",
      className: "bg-rose-50 text-rose-800 border-rose-200",
    };
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                aria-label="Back to dashboard"
                className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-black flex items-center justify-center transition cursor-pointer text-gray-700 shadow-xs"
              >
                <FaArrowLeft size={13} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-950">
                Interview History
              </h1>
            </div>
            <p className="text-sm text-gray-500 pl-12 sm:pl-0">
              Track past mock interviews, review saved performance evaluations, or resume unfinished sessions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/interview")}
            className="self-start sm:self-auto bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <FaPlus size={11} />
            <span>New Interview</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600 font-medium">
              Loading your interview history...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
              <FaExclamationTriangle />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Unable to Load History
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2"
              >
                <FaRedo size={12} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && interviews.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 p-10 sm:p-16 text-center shadow-xs max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-5 text-2xl">
              <FaBriefcase />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No Interviews Found
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-md mx-auto">
              You haven&apos;t completed any mock interviews yet. Start your first session to receive personalized questions and AI-powered performance evaluations.
            </p>
            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="bg-black hover:bg-gray-800 text-white px-7 py-3 rounded-full text-sm font-semibold transition cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              <FaPlus size={12} />
              <span>Start Your First Interview</span>
            </button>
          </div>
        )}

        {/* Data State: Interview Cards */}
        {!loading && !error && interviews.length > 0 && (
          <div className="space-y-6">
            {/* Meta Summary Bar */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 px-1">
              <span>
                Showing{" "}
                <strong className="text-gray-900 font-semibold">
                  {(page - 1) * pagination.limit + 1}–
                  {Math.min(page * pagination.limit, pagination.total)}
                </strong>{" "}
                of{" "}
                <strong className="text-gray-900 font-semibold">
                  {pagination.total}
                </strong>{" "}
                total interviews
              </span>
              <span>Page {page} of {pagination.totalPages}</span>
            </div>

            {/* List of Interview Cards */}
            <div className="grid gap-4 sm:gap-5">
              {interviews.map((item) => {
                const isCompleted = item.status === "completed";
                const tier = isCompleted ? getScoreBadge(item.overallScore) : null;

                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5"
                  >
                    {/* Top Row: Role, Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-950 leading-snug">
                          {item.role || "Untitled Role"}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1.5">
                            <FaBriefcase size={12} className="text-gray-400" />
                            <span>{item.experience || "Experience not specified"}</span>
                          </span>
                          <span>•</span>
                          <span className="font-medium uppercase tracking-wider text-gray-600">
                            {item.interviewType === "hr" ? "HR / Behavioral" : "Technical"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <FaClock size={11} className="text-gray-400" />
                            <span>{formatDate(item.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <FaCheckCircle size={11} className="text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <FaHourglassHalf size={11} className="text-amber-600" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Score / Progress details & Action Button */}
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Score or Status Note */}
                      <div>
                        {isCompleted ? (
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block">
                                Overall Score
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-gray-950">
                                {item.overallScore !== null && item.overallScore !== undefined
                                  ? Number(item.overallScore).toFixed(1)
                                  : "0.0"}
                                <span className="text-xs font-normal text-gray-400 ml-1">/ 10</span>
                              </span>
                            </div>
                            {tier && (
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tier.className}`}
                              >
                                {tier.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl font-medium inline-block">
                            Answers pending evaluation
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/report/${item._id}`)}
                            className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>View Performance Report</span>
                            <FaArrowRight size={11} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/interview/${item._id}`)}
                            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>Resume Interview</span>
                            <FaArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-black bg-white border border-gray-200 rounded-full transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
                >
                  <FaArrowLeft size={11} />
                  <span>Previous Page</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        disabled={loading}
                        className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                          p === page
                            ? "bg-black text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages || loading}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-black bg-white border border-gray-200 rounded-full transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Next Page</span>
                  <FaArrowRight size={11} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default InterviewHistory;
