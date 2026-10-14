import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  BsRobot,
  BsBarChart,
  BsFileEarmarkText,
  BsLightningCharge,
  BsArrowRight,
  BsCodeSlash,
  BsPeople,
  BsClock,
} from "react-icons/bs";
import { HiSparkles } from "react-icons/hi2";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import AuthModel from "../components/Authmodel.jsx";

function Home() {
  const { userData } = useSelector((state) => state.user);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const handleStartInterview = () => {
    if (!userData) {
      setShowAuth(true);
      return;
    }
    navigate("/interview");
  };

  const handleViewHistory = () => {
    if (!userData) {
      setShowAuth(true);
      return;
    }
    navigate("/history");
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Top Pill */}
          <div className="flex justify-center mb-6">
            <div className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-xs">
              <HiSparkles size={16} className="text-green-600" />
              <span>AI-Powered Smart Interview Platform</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-20 md:mb-28">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight max-w-4xl mx-auto"
            >
              Practice Interviews with{" "}
              <span className="bg-green-100 text-green-700 px-4 py-1 rounded-2xl inline-block mt-1 sm:mt-0">
                AI Intelligence
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-gray-600 mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed"
            >
              Role-based mock interviews with custom question generation,
              targeted technical or HR evaluations, and actionable feedback.
            </motion.p>

            <div className="flex flex-wrap justify-center gap-4 mt-8 md:mt-10">
              <motion.button
                type="button"
                onClick={handleStartInterview}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-black text-white px-8 sm:px-10 py-3.5 rounded-full font-medium hover:bg-gray-800 transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Start Interview</span>
                <BsArrowRight size={16} />
              </motion.button>

              <motion.button
                type="button"
                onClick={handleViewHistory}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white border border-gray-300 text-gray-800 px-8 sm:px-10 py-3.5 rounded-full font-medium hover:bg-gray-50 transition cursor-pointer"
              >
                View History
              </motion.button>
            </div>
          </div>

          {/* 3 Step Workflow */}
          <div className="mb-24 md:mb-32">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                How It Works
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mt-2">
                A structured 3-step workflow designed to simulate realistic interview environments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: <BsFileEarmarkText size={22} />,
                  step: "STEP 1",
                  title: "Role & Resume Setup",
                  desc: "Specify your target role and experience, or upload your PDF resume to auto-extract technical skills.",
                },
                {
                  icon: <BsRobot size={22} />,
                  step: "STEP 2",
                  title: "AI-Generated Questions",
                  desc: "Receive 5 tailored interview questions matched to your role, skills, and chosen interview format.",
                },
                {
                  icon: <BsBarChart size={22} />,
                  step: "STEP 3",
                  title: "Detailed Evaluation",
                  desc: "Submit your typed responses and get comprehensive feedback on technical accuracy and clarity.",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs hover:shadow-md transition-shadow relative"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <div className="text-xs font-semibold text-green-600 tracking-wider mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="mb-20 md:mb-28">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Core Capabilities
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mt-2">
                Engineered for realistic practice across technical and HR tracks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {[
                {
                  icon: <BsCodeSlash size={22} />,
                  title: "Technical Interview Track",
                  desc: "Evaluates systems architecture, problem-solving, code accuracy, and domain-specific depth.",
                  tag: "Technical Mode",
                },
                {
                  icon: <BsPeople size={22} />,
                  title: "HR & Behavioral Track",
                  desc: "Tests leadership, situational judgment, team collaboration, and communication using the STAR framework.",
                  tag: "HR Mode",
                },
                {
                  icon: <BsLightningCharge size={22} />,
                  title: "Resume Skill Extraction",
                  desc: "Upload a PDF resume to extract skills, project titles, and recommended job roles via server-side AI parsing.",
                  tag: "Resume-Driven",
                },
                {
                  icon: <BsClock size={22} />,
                  title: "Instant Scoring & Feedback",
                  desc: "Calculate individual question accuracy scores and an overall score out of 10 with actionable improvement summaries.",
                  tag: "Objective Scoring",
                },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-3xl p-7 shadow-xs hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick CTA Banner */}
          <div className="bg-black text-white rounded-3xl p-8 sm:p-12 text-center mb-16 shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to elevate your interview readiness?
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
              Configure your desired role and experience in seconds, or upload your resume for tailored question generation.
            </p>
            <button
              type="button"
              onClick={handleStartInterview}
              className="bg-white text-black px-8 py-3.5 rounded-full font-semibold hover:bg-gray-100 transition shadow-sm cursor-pointer inline-flex items-center gap-2"
            >
              <span>Get Started Now</span>
              <BsArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>

      <Footer />
      {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default Home;
