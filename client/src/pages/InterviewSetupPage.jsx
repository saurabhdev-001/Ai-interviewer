import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaRobot, FaFileAlt, FaChartLine } from "react-icons/fa";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import InterviewSetup from "../components/InterviewSetup.jsx";

function InterviewSetupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 sm:px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Top navigation row */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition cursor-pointer"
            >
              <FaArrowLeft size={12} />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Main 2-column or stacked layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Inspiration & Info */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full inline-block mb-4">
                Interview Preparation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-4">
                Configure Your Mock Interview
              </h1>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-8">
                Our AI model generates five tailored interview questions matched
                to your desired position, experience level, and uploaded skills.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: <FaRobot className="text-green-600" />,
                    title: "5 Tailored Questions",
                    desc: "Adaptive question generation built for modern engineering and HR standards.",
                  },
                  {
                    icon: <FaFileAlt className="text-green-600" />,
                    title: "Smart Resume Extraction",
                    desc: "PDF parsing automatically extracts your skills and projects for targeted questioning.",
                  },
                  {
                    icon: <FaChartLine className="text-green-600" />,
                    title: "Actionable Feedback",
                    desc: "Individual answer evaluations and an overall performance score out of 10.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100"
                  >
                    <div className="p-2.5 rounded-xl bg-white text-base shadow-2xs shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-gray-900">
                        {item.title}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Setup Form */}
            <div className="lg:col-span-7">
              <InterviewSetup />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default InterviewSetupPage;
