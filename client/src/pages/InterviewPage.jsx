import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaRedo, FaExclamationTriangle } from "react-icons/fa";
import api from "../services/api";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Step2Interview from "../components/Step2Interview.jsx";
import Step3Report from "../components/Step3Report.jsx";

function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [interview, setInterview] = useState(null);

  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const inFlightCompleteRef = useRef(false);

  const fetchInterview = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setFetchError("");

    try {
      const response = await api.get(`/api/interview/${id}`);
      if (response.data && response.data.success && response.data.interview) {
        setInterview(response.data.interview);
      } else {
        setFetchError("Unable to retrieve interview session.");
      }
    } catch (error) {
      console.error("Fetch interview error:", error?.message || "Unknown error");
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 404) {
        setFetchError("Interview session not found. It may belong to another account or does not exist.");
      } else if (status === 400) {
        setFetchError("Invalid interview ID format.");
      } else if (status === 401) {
        setFetchError("Authentication required to view this interview.");
      } else {
        setFetchError(
          backendMessage ||
            "Unable to connect to the server. Please check your internet connection."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    api
      .get(`/api/interview/${id}`)
      .then((response) => {
        if (ignore) return;
        if (response.data && response.data.success && response.data.interview) {
          setInterview(response.data.interview);
        } else {
          setFetchError("Unable to retrieve interview session.");
        }
      })
      .catch((error) => {
        if (ignore) return;
        const status = error?.response?.status;
        const backendMessage = error?.response?.data?.message;
        if (status === 404) {
          setFetchError(
            "Interview session not found. It may belong to another account or does not exist."
          );
        } else if (status === 400) {
          setFetchError("Invalid interview ID format.");
        } else if (status === 401) {
          setFetchError("Authentication required to view this interview.");
        } else {
          setFetchError(
            backendMessage ||
              "Unable to connect to the server. Please check your internet connection."
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleAnswerSubmitted = (updatedQuestion) => {
    if (!updatedQuestion || !updatedQuestion._id) return;

    setInterview((prev) => {
      if (!prev) return prev;
      const updatedQuestions = prev.questions.map((q) =>
        q._id === updatedQuestion._id ? updatedQuestion : q
      );
      return {
        ...prev,
        questions: updatedQuestions,
      };
    });
  };

  const handleCompleteInterview = async () => {
    if (inFlightCompleteRef.current || completing || !interview) return;

    inFlightCompleteRef.current = true;
    setCompleting(true);
    setCompletionError("");

    try {
      const response = await api.post(`/api/interview/${id}/complete`);

      if (response.data && response.data.success && response.data.interview) {
        setInterview(response.data.interview);
      } else {
        setCompletionError(
          response.data?.message ||
            "Failed to complete interview and generate report."
        );
      }
    } catch (error) {
      console.error("Complete interview error:", error?.message || "Unknown error");
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;

      if (status === 409) {
        setCompletionError(
          backendMessage ||
            "All 5 questions must be answered and evaluated before completing."
        );
        // Refresh to reconcile state
        fetchInterview();
      } else if (status === 502) {
        setCompletionError(
          backendMessage ||
            "The AI summary service is temporarily busy. Your evaluations are safe. Please click retry."
        );
      } else {
        setCompletionError(
          backendMessage ||
            "A network or server error occurred while finalizing the report. Please retry."
        );
      }
    } finally {
      inFlightCompleteRef.current = false;
      setCompleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium text-sm sm:text-base">
            Loading interview session...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (fetchError || !interview) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
              <FaExclamationTriangle />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Load Interview
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {fetchError || "Interview session not available."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FaArrowLeft size={12} />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={fetchInterview}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FaRedo size={12} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // View A: Completed -> Final Report
  if (interview.status === "completed") {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Step3Report report={interview} />
        </main>
        <Footer />
      </div>
    );
  }

  // View B: In Progress -> Active Interview Room
  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 py-8 md:py-12">
        <Step2Interview
          interview={interview}
          onAnswerSubmitted={handleAnswerSubmitted}
          onCompleteInterview={handleCompleteInterview}
          completing={completing}
          completionError={completionError}
        />
      </main>
      <Footer />
    </div>
  );
}

export default InterviewPage;
