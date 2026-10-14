import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Route, Routes } from "react-router-dom";
import api, { ServerUrl } from "./services/api";
import {
  setUserData,
  setSessionLoading,
  setSessionError,
  clearSessionError,
} from "./redux/userSlice";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import InterviewSetupPage from "./pages/InterviewSetupPage.jsx";
import InterviewTransitionPage from "./pages/InterviewTransitionPage.jsx";

export { ServerUrl };

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      try {
        dispatch(setSessionLoading(true));
        dispatch(clearSessionError());
        const result = await api.get("/api/user/current-user");
        if (isMounted) {
          dispatch(setUserData(result.data));
        }
      } catch (error) {
        if (!isMounted) return;
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

    getUser();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/Auth" element={<Auth />} />
      <Route
        path="/interview"
        element={
          <ProtectedRoute>
            <InterviewSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <InterviewTransitionPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;