import axios from "axios";

export const ServerUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: ServerUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
