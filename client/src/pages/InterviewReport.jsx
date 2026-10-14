import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaRedo, FaExclamationTriangle } from "react-icons/fa";
import api from "../services/api";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Step3Report from "../components/Step3Report.jsx";

function InterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const result = await api.get(`/api/interview/${id}`);
      if (result.data && result.data.success && result.data.interview) {
        setReport(result.data.interview);
      } else {
        setError("Report could not be retrieved.");
      }
    } catch (err) {
      console.error("Fetch report error:", err?.message || "Unknown error");
      const status = err?.response?.status;
      if (status === 404) {
        setError("Interview report not found.");
      } else if (status === 401) {
        setError("Authentication required to view this report.");
      } else {
        setError("Unable to load report. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    api
      .get(`/api/interview/${id}`)
      .then((result) => {
        if (ignore) return;
        if (result.data && result.data.success && result.data.interview) {
          setReport(result.data.interview);
        } else {
          setError("Report could not be retrieved.");
        }
      })
      .catch((err) => {
        if (ignore) return;
        const status = err?.response?.status;
        if (status === 404) {
          setError("Interview report not found.");
        } else if (status === 401) {
          setError("Authentication required to view this report.");
        } else {
          setError("Unable to load report. Please check your connection.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium text-sm">
            Loading performance report...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
              <FaExclamationTriangle />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Load Report
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {error || "Report not found."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2"
              >
                <FaArrowLeft size={12} />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={fetchReport}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2"
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

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Step3Report report={report} />
      </main>
      <Footer />
    </div>
  );
}

export default InterviewReport;
