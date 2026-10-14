import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaArrowLeft, FaPlus, FaListOl } from "react-icons/fa";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

function InterviewTransitionPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const interview = location.state?.interview;

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-3xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6 text-2xl">
            <FaCheckCircle />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full inline-block mb-3">
            Phase 14 Complete
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Interview Session Created!
          </h1>

          <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
            Your 5 tailored questions have been generated and saved to the database.
          </p>

          {/* Details Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Session ID</span>
              <span className="font-mono text-gray-800 break-all">{id}</span>
            </div>
            {interview?.role && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Role</span>
                <span className="font-semibold text-gray-800">{interview.role}</span>
              </div>
            )}
            {interview?.experience && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Experience</span>
                <span className="text-gray-800">{interview.experience}</span>
              </div>
            )}
            {interview?.interviewType && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Interview Type</span>
                <span className="capitalize text-gray-800">
                  {interview.interviewType}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-medium">Questions Prepared</span>
              <span className="font-semibold text-green-700 flex items-center gap-1">
                <FaListOl size={12} />
                <span>5 Questions</span>
              </span>
            </div>
          </div>

          {/* Phase 15 Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs sm:text-sm mb-8 leading-relaxed">
            <p className="font-semibold mb-1">Upcoming in Phase 15:</p>
            <p>
              The live interview room with typed answer submission and AI
              evaluation will be integrated in Phase 15. Your interview session is
              persisted and ready for simulation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FaArrowLeft size={12} />
              <span>Back to Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 px-6 py-3 rounded-full text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FaPlus size={12} />
              <span>Create Another Session</span>
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default InterviewTransitionPage;
