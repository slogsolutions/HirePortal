// src/context/AuthContext.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

/**
 * Simple AuthContext with:
 * - user, token
 * - loading, error
 * - login({email, password, remember}) -> stores token + user
 * - register(...) -> demo (calls login after register)
 * - logout()
 * - authFetch(url, opts) helper to send Authorization header
 *
 * NOTE: This is a demo scaffolding. Replace the fake API parts with real endpoints.
 */

const STORAGE_KEY = "auth:v1";

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
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { user: null, token: null, expiresAt: null };
    } catch (e) {
      return { user: null, token: null, expiresAt: null };
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // derived values
  const user = auth.user;
  const token = auth.token;
  const isAuthenticated = !!token && !!user && (!auth.expiresAt || Date.now() < auth.expiresAt);

  // Persist changes to localStorage
  useEffect(() => {
    try {
      if (auth && (auth.user || auth.token)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      // ignore storage errors
      // you may want to set an error state in.strict environments
    }
  }, [auth]);

  // Auto-logout when token expires
  useEffect(() => {
    if (!auth.expiresAt) return;

    const msUntilExpiry = auth.expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      // already expired
      setAuth({ user: null, token: null, expiresAt: null });
      return;
    }

    const tid = setTimeout(() => {
      setAuth({ user: null, token: null, expiresAt: null });
    }, msUntilExpiry);

    return () => clearTimeout(tid);
  }, [auth.expiresAt]);

  // Helper: set auth with optional ttl (ms)
  const setAuthState = useCallback(({ user = null, token = null, ttl = null }) => {
    const expiresAt = token && ttl ? Date.now() + ttl : null;
    setAuth({ user, token, expiresAt });
  }, []);

  // Demo login - replace with real API call
  // Accepts { email, password, remember }.
  // `remember` controls token ttl (longer vs session)
  const login = useCallback(async ({ email, password, remember = false }) => {
    setLoading(true);
    setError(null);

    try {
      // ----- Replace this block with your real login API call -----
      // Example using fetch:
      // const res = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      // if (!res.ok) throw new Error('Login failed');
      // const data = await res.json(); // expect { user, token, expiresIn }
      //
      // For demo purposes we fake a response:
      await new Promise((r) => setTimeout(r, 500)); // simulate network
      if (!email || !password) throw new Error("Missing credentials");
      const fakeToken = "fake-jwt-token-" + Math.random().toString(36).slice(2);
      const fakeUser = { id: 1, email };
      const ttl = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8; // 30d vs 8h
      // ----------------------------------------------------------------

      setAuthState({ user: fakeUser, token: fakeToken, ttl });
      setLoading(false);
      return { user: fakeUser, token: fakeToken };
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
      throw err;
    }
  }, [setAuthState]);

  // Demo register - replace with real endpoint
  const register = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      // Replace with actual register API call
      await new Promise((r) => setTimeout(r, 400));
      // After successful registration, log the user in (common pattern)
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

  // Helper to attach Authorization header to fetch calls
  const authFetch = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", headers.get("Content-Type") || "application/json");

      const res = await fetch(input, { ...init, headers });
      // Optional: if 401 received, auto-logout
      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized user");
      }
      return res;
    },
    [token, logout]
  );

  // Memoize context value to avoid unnecessary renders
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
