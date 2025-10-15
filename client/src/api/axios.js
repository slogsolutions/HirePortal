
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const instance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/**
 * 🔐 Request Interceptor
 * - Reads the stored auth object from localStorage ("auth:v1")
 * - Extracts the JWT token
 * - Attaches it as Authorization: Bearer <token>
 */
instance.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("auth:v1");
      if (stored) {
        const auth = JSON.parse(stored);
        const token = auth?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse auth token:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 🚫 Response Interceptor
 * - Logs the user out if a 401 Unauthorized is received
 * - (Optional) Redirects to login page
 */
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized — clearing auth");
      localStorage.removeItem("auth:v1");
      // Optional: redirect to login
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default instance;
