import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../services/api";
import {
  setUserData,
  setSessionLoading,
  setSessionError,
  clearSessionError,
} from "../redux/userSlice";

function ProtectedRoute({ children, redirectTo = "/auth" }) {
  const { userData, isSessionLoading, sessionError } = useSelector(
    (state) => state.user
  );
  const location = useLocation();
  const dispatch = useDispatch();

  const handleRetry = async () => {
    try {
      dispatch(clearSessionError());
      dispatch(setSessionLoading(true));
      const result = await api.get("/api/user/current-user");
      dispatch(setUserData(result.data));
    } catch (error) {
      if (error?.response?.status === 401) {
        dispatch(setUserData(null));
      } else {
        const errorMsg =
          error?.response?.data?.message ||
          "Unable to reach the server. Please check your connection.";
        dispatch(setSessionError(errorMsg));
      }
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading session...</p>
      </div>
    );
  }

  if (sessionError && !userData) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Connection Problem
          </h2>
          <p className="text-sm text-gray-500 mb-6">{sessionError}</p>
          <button
            onClick={handleRetry}
            className="w-full bg-black text-white py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
