import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "auth:v1";
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001/api";

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  authFetch: async () => {},
});

export const AuthProvider = ({ children }) => {
  // 🔥 Load from BOTH new & legacy storage
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);

      // fallback for old format
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      if (token && user) {
        return { token, user: JSON.parse(user), expiresAt: null };
      }

      return { user: null, token: null, expiresAt: null };
    } catch {
      return { user: null, token: null, expiresAt: null };
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = auth.user;
  const token = auth.token;
  const isAuthenticated = !!token && !!user && (!auth.expiresAt || Date.now() < auth.expiresAt);

  // 🔁 Persist auth state to BOTH formats
  useEffect(() => {
    if (auth?.token && auth?.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      localStorage.setItem("token", auth.token);
      localStorage.setItem("user", JSON.stringify(auth.user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [auth]);

  // ⏳ Auto logout on expiry
  useEffect(() => {
    if (!auth.expiresAt) return;
    const ms = auth.expiresAt - Date.now();
    if (ms <= 0) return setAuth({ user: null, token: null, expiresAt: null });
    const t = setTimeout(() => setAuth({ user: null, token: null, expiresAt: null }), ms);
    return () => clearTimeout(t);
  }, [auth.expiresAt]);

  const setAuthState = useCallback(({ user = null, token = null, ttl = null }) => {
    const expiresAt = token && ttl ? Date.now() + ttl : null;
    setAuth({ user, token, expiresAt });
  }, []);

  // 🔐 LOGIN
  const login = useCallback(async ({ email, password, remember = false }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Login failed");
      }

      const data = await res.json(); // { token, user }

      console.log("[AuthContext] 🔐 Login successful, received data:", data);
      console.log("[AuthContext] 🔍 User object from login:", data.user);

      const ttl = remember
        ? 1000 * 60 * 60 * 24 * 30
        : 1000 * 60 * 60 * 8;

      setAuthState({ user: data.user, token: data.token, ttl });
      
      console.log("[AuthContext] ✅ Auth state set with user:", data.user);
      
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
      throw err;
    }
  }, [setAuthState]);

  // 📝 REGISTER
  const register = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Registration failed");
      }

      const result = await login({ email, password, remember: true });
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message || "Registration failed");
      setLoading(false);
      throw err;
    }
  }, [login]);

  const logout = useCallback(() => {
    setAuth({ user: null, token: null, expiresAt: null });
    setError(null);
    setLoading(false);
  }, []);

  // 🔑 Authenticated fetch
  const authFetch = useCallback(async (input, init = {}) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const currentToken = saved?.token || token;

    const headers = new Headers(init.headers || {});
    if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
      logout();
      throw new Error("Unauthorized");
    }
    return res;
  }, [token, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      loading,
      error,
      login,
      register,
      logout,
      authFetch,
    }),
    [user, token, isAuthenticated, loading, error, login, register, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
