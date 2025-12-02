// import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

// const STORAGE_KEY = "auth:v1";
// const API_BASE = import.meta.env.VITE_API_BASE; // 👈 backend base URL

// export const AuthContext = createContext({
//   user: null,
//   token: null,
//   isAuthenticated: false,
//   loading: false,
//   error: null,
//   login: async () => {},
//   register: async () => {},
//   logout: () => {},
//   authFetch: async () => {},
// });

// export const AuthProvider = ({ children }) => {
//   const [auth, setAuth] = useState(() => {
//     try {
//       const raw = localStorage.getItem(STORAGE_KEY);
//       return raw ? JSON.parse(raw) : { user: null, token: null, expiresAt: null };
//     } catch {
//       return { user: null, token: null, expiresAt: null };
//     }
//   });

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const user = auth.user;
//   const token = auth.token;
//   const isAuthenticated = !!token && !!user && (!auth.expiresAt || Date.now() < auth.expiresAt);

//   // persist state
//   useEffect(() => {
//     if (auth && (auth.user || auth.token)) {
//       localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
//     } else {
//       localStorage.removeItem(STORAGE_KEY);
//     }
//   }, [auth]);

//   // auto logout when token expires
//   useEffect(() => {
//     if (!auth.expiresAt) return;
//     const msUntilExpiry = auth.expiresAt - Date.now();
//     if (msUntilExpiry <= 0) return setAuth({ user: null, token: null, expiresAt: null });

//     const tid = setTimeout(() => setAuth({ user: null, token: null, expiresAt: null }), msUntilExpiry);
//     return () => clearTimeout(tid);
//   }, [auth.expiresAt]);

//   const setAuthState = useCallback(({ user = null, token = null, ttl = null }) => {
//     const expiresAt = token && ttl ? Date.now() + ttl : null;
//     setAuth({ user, token, expiresAt });
//   }, []);

//   // 🔐 LOGIN — hits your backend now
//   const login = useCallback(async ({ email, password, remember = false }) => {
//     setLoading(true);
//     setError(null);

//     try {
//       const res = await fetch(`${API_BASE}/auth/login`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password }),
//       });

//       if (!res.ok) {
//         const errData = await res.json().catch(() => ({}));
//         throw new Error(errData.message || "Login failed");
//       }

//       const data = await res.json();
//       // Example expected from backend:
//       // { user: {...}, token: "jwt", expiresIn: 3600 }

//       const ttl = remember
//         ? 1000 * 60 * 60 * 24 * 30 // 30 days
//         : data.expiresIn
//         ? data.expiresIn * 1000
//         : 1000 * 60 * 60 * 8; // fallback 8 hours

//       setAuthState({ user: data.user, token: data.token, ttl });
//       setLoading(false);
//       return { user: data.user, token: data.token };
//     } catch (err) {
//       setError(err.message || "Login failed");
//       setLoading(false);
//       throw err;
//     }
//   }, [setAuthState]);

//   // 🧾 REGISTER — also uses API_BASE
//   const register = useCallback(
//     async ({ email, password }) => {
//       setLoading(true);
//       setError(null);
//       try {
//         const res = await fetch(`${API_BASE}/auth/register`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ email, password }),
//         });

//         if (!res.ok) {
//           const errData = await res.json().catch(() => ({}));
//           throw new Error(errData.message || "Registration failed");
//         }

//         // auto login
//         const result = await login({ email, password, remember: true });
//         setLoading(false);
//         return result;
//       } catch (err) {
//         setError(err.message || "Registration failed");
//         setLoading(false);
//         throw err;
//       }
//     },
//     [login]
//   );

//   const logout = useCallback(() => {
//     setAuth({ user: null, token: null, expiresAt: null });
//     setError(null);
//     setLoading(false);
//   }, []);

//   // 🔐 authenticated fetch
//   const authFetch = useCallback(
//     async (input, init = {}) => {
//       const headers = new Headers(init.headers || {});
//       if (token) headers.set("Authorization", `Bearer ${token}`);
//       if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

//       const res = await fetch(input, { ...init, headers });
//       if (res.status === 401) {
//         logout();
//         throw new Error("Unauthorized user");
//       }
//       return res;
//     },
//     [token, logout]
//   );

//   const value = useMemo(
//     () => ({
//       user,
//       token,
//       isAuthenticated,
//       loading,
//       error,
//       login,
//       register,
//       logout,
//       authFetch,
//     }),
//     [user, token, isAuthenticated, loading, error, login, register, logout, authFetch]
//   );

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };





import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "auth:v1";
const API_BASE = import.meta.env.VITE_API_BASE; // e.g. http://localhost:5000/api

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
    } catch {
      return { user: null, token: null, expiresAt: null };
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = auth.user;
  const token = auth.token;
  const isAuthenticated = !!token && !!user && (!auth.expiresAt || Date.now() < auth.expiresAt);

  // persist auth state
  useEffect(() => {
    if (auth && (auth.user || auth.token)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  // auto logout on token expiry
  useEffect(() => {
    if (!auth.expiresAt) return;
    const msUntilExpiry = auth.expiresAt - Date.now();
    if (msUntilExpiry <= 0) return setAuth({ user: null, token: null, expiresAt: null });

    const tid = setTimeout(() => setAuth({ user: null, token: null, expiresAt: null }), msUntilExpiry);
    return () => clearTimeout(tid);
  }, [auth.expiresAt]);

  const setAuthState = useCallback(({ user = null, token = null, ttl = null }) => {
    const expiresAt = token && ttl ? Date.now() + ttl : null;
    setAuth({ user, token, expiresAt });
  }, []);

  // LOGIN (uses real backend)
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

      const data = await res.json();
      // Backend should return: { user, token, expiresIn }

      const ttl = remember
        ? 1000 * 60 * 60 * 24 * 30 // 30 days
        : data.expiresIn
        ? data.expiresIn * 1000
        : 1000 * 60 * 60 * 8; // fallback 8h

      setAuthState({ user: data.user, token: data.token, ttl });
      setLoading(false);
      return { user: data.user, token: data.token };
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
      throw err;
    }
  }, [setAuthState]);

  // REGISTER
  const register = useCallback(
    async ({ email, password }) => {
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
    },
    [login]
  );

  const logout = useCallback(() => {
    setAuth({ user: null, token: null, expiresAt: null });
    setError(null);
    setLoading(false);
  }, []);

  /**
   * ✅ Authenticated fetch helper — always pulls fresh token from localStorage
   */
  const authFetch = useCallback(async (input, init = {}) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedAuth = raw ? JSON.parse(raw) : null;
    const currentToken = savedAuth?.token || token;

    const headers = new Headers(init.headers || {});
    if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(input, { ...init, headers });

    if (res.status === 401) {
      logout();
      throw new Error("Unauthorized user");
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
