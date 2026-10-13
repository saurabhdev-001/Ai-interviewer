
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { BsRobot } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi2";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import axios from "axios";
import { ServerUrl } from "../App";
import { setUserData } from "../redux/userSlice";

function Auth({ isModel = false }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const inFlightRef = useRef(false);

    const handleGoogleAuth = async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setLoading(true);
        setErrorMessage("");

        try {
            const response = await signInWithPopup(auth, provider);
            const idToken = await response.user.getIdToken();
            const apiRes = await axios.post(
                ServerUrl + "/api/auth/google",
                { idToken },
                { withCredentials: true }
            );
            if (apiRes?.data?.user) {
                dispatch(setUserData(apiRes.data.user));
            }
            if (!isModel) {
                navigate("/");
            }
        } catch (error) {
            console.error("Authentication error:", error?.message || "Sign-in failed");
            if (error?.code === "auth/cancelled-popup-request") {
                setErrorMessage("Sign-in request was cancelled. Please try again.");
            } else if (error?.code === "auth/popup-closed-by-user") {
                setErrorMessage("Sign-in popup was closed before completing. Please try again.");
            } else if (error?.code === "auth/popup-blocked") {
                setErrorMessage("Popup was blocked by your browser. Please allow popups for this site.");
            } else if (error?.code === "auth/network-request-failed") {
                setErrorMessage("Network error occurred. Please check your internet connection.");
            } else if (error?.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage("Authentication failed. Please try again.");
            }
        } finally {
            inFlightRef.current = false;
            setLoading(false);
        }
    };

    return (
        <div className={isModel ? "w-full flex justify-center items-center" : "w-full min-h-screen bg-[#f3f3f3] flex justify-center items-center px-6 py-20"}>
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.05 }}
                className="w-full max-w-md p-8 rounded-3xl bg-white shadow-2xl border border-gray-200"
            >
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="bg-black text-white p-2 rounded-lg">
                        <BsRobot size={18} />
                    </div>
                    <h2 className="font-semibold text-lg">InterviewIQ.AI</h2>
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold text-center leading-snug mb-4">
                    Continue with{" "}
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full inline-flex items-center gap-2">
                        <HiSparkles size={18} />
                        AI Smart Interview
                    </span>
                </h1>
                <p className="text-gray-500 text-center text-sm md:text-base leading-relaxed mb-8">
                    Sign in to start AI-powered mock interviews and get personalized feedback to improve your skills.
                </p>

                {errorMessage && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
                        {errorMessage}
                    </div>
                )}

                <motion.button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    whileHover={loading ? {} : { opacity: 0.85, scale: 1.02 }}
                    whileTap={loading ? {} : { opacity: 1, scale: 0.98 }}
                    className={`w-full flex items-center justify-center gap-3 py-3 rounded-full shadow-md text-white transition-opacity ${
                        loading ? "bg-gray-400 cursor-not-allowed" : "bg-black cursor-pointer"
                    }`}
                >
                    <FcGoogle size={20} />
                    {loading ? "Signing in..." : "Continue with Google"}
                </motion.button>
            </motion.div>
        </div>
    );
}
export default Auth;
