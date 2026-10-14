import { BsRobot } from "react-icons/bs";

function Footer() {
  return (
    <footer className="bg-[#f3f3f3] flex justify-center px-4 pb-10 py-4 pt-10">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xs border border-gray-200 py-8 px-4 text-center">
        <div className="flex justify-center items-center gap-3 mb-3">
          <div className="bg-black text-white p-2 rounded-lg">
            <BsRobot size={16} />
          </div>
          <h2 className="font-semibold text-gray-900">InterviewIQ.AI</h2>
        </div>
        <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
          AI-powered interview preparation platform designed to improve
          communication skills, technical depth, and professional confidence.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
