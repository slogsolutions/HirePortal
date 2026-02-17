
import axios from "axios";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001/api";


const instance = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

/**
 * 🔐 REQUEST INTERCEPTOR (with detailed debug logs)
 */
instance.interceptors.request.use(
  (config) => {
    try {

      // Get token from the correct storage location used by AuthContext
      const authData = localStorage.getItem("auth:v1");
      let token = null;
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = parsed?.token;
        } catch (e) {
          console.warn("⚠️ Failed to parse auth:v1 data:", e);
        }
      }
      
      // Fallback to legacy storage
      if (!token) {
        token = localStorage.getItem("token");
      }

      console.log("🔑 Token found:", token ? "✅ Yes" : "❌ No");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("⚠️ No token found in localStorage");
      }

      console.log("📦 Final headers:", config.headers);
      console.groupEnd();
    } catch (err) {
      console.warn("⚠️ Failed to parse or attach token:", err);
    }

    return config;
  },
  (error) => {
    console.error(" Axios Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

/**
 * 🚫 RESPONSE INTERCEPTOR (with debug logs)
 */
// instance.interceptors.response.use(
//   (response) => {
//     console.groupCollapsed(" [Axios Response]");
//     console.log("➡️ URL:", response.config.url);
//     console.log("➡️ Status:", response.status);
//     console.log("📦 Data:", response.data);
//     console.groupEnd();
//     return response;
//   },
//   (error) => {
//     console.groupCollapsed("❌ [Axios Error Response]");
//     console.log("➡️ URL:", error.config?.url);
//     console.log("➡️ Status:", error.response?.status);
//     console.log("➡️ Data:", error.response?.data);
//     console.groupEnd();

//     if (error.response?.status === 401) {
//       console.warn(" Unauthorized — clearing auth and redirecting");
//       localStorage.removeItem("auth:v1");
//       // window.location.href = "/login"; // optional redirect
//     }

//     return Promise.reject(error);
//   }
// );

export default instance;
