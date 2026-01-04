
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const instance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/**
 * 🔐 REQUEST INTERCEPTOR (with detailed debug logs)
 */
instance.interceptors.request.use(
  (config) => {
    try {
      console.groupCollapsed("🚀 [Axios Request Interceptor]");
      console.log("➡️ Base URL:", API_BASE);
      console.log("➡️ Request URL:", config.url);
      console.log("➡️ Method:", config.method?.toUpperCase());
      console.log("➡️ Headers before attach:", config.headers);

      // Try multiple keys just in case token is stored differently
      const stored =
        localStorage.getItem("auth:v1") ||
        localStorage.getItem("auth") ||
        localStorage.getItem("user");

      if (stored) {
        const parsed = JSON.parse(stored);
        const token =
          parsed?.token ||
          parsed?.accessToken ||
          parsed?.data?.token ||
          parsed?.data?.accessToken;

        console.log("🔑 Token found:", token ? "✅ Yes" : "❌ No");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        console.warn("⚠️ No auth object found in localStorage");
      }

      console.log("📦 Final headers:", config.headers);
      console.groupEnd();
    } catch (err) {
      console.warn("⚠️ Failed to parse or attach token:", err);
    }

    return config;
  },
  (error) => {
    console.error("❌ Axios Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

/**
 * 🚫 RESPONSE INTERCEPTOR (with debug logs)
 */
instance.interceptors.response.use(
  (response) => {
    console.groupCollapsed("✅ [Axios Response]");
    console.log("➡️ URL:", response.config.url);
    console.log("➡️ Status:", response.status);
    console.log("📦 Data:", response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    console.groupCollapsed("❌ [Axios Error Response]");
    console.log("➡️ URL:", error.config?.url);
    console.log("➡️ Status:", error.response?.status);
    console.log("➡️ Data:", error.response?.data);
    console.groupEnd();

    if (error.response?.status === 401) {
      console.warn("🚫 Unauthorized — clearing auth and redirecting");
      localStorage.removeItem("auth:v1");
      // window.location.href = "/login"; // optional redirect
    }

    return Promise.reject(error);
  }
);

export default instance;
