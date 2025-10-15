import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

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
  const [authState, setAuthState] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      return {
        user: user ? JSON.parse(user) : null,
        token: token,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('Error parsing auth data:', error);
      return { user: null, token: null, loading: false, error: null };
    }
  });

  // Set axios default headers
  useEffect(() => {
    if (authState.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authState.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [authState.token]);

  // Persist auth state to localStorage
  useEffect(() => {
    if (authState.token) {
      localStorage.setItem('token', authState.token);
      if (authState.user) {
        localStorage.setItem('user', JSON.stringify(authState.user));
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [authState.token, authState.user]);

  const login = useCallback(async (email, password) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { user, token } = response.data;
      
      if (!token) {
        throw new Error('No authentication token received');
      }

      setAuthState({
        user,
        token,
        loading: false,
        error: null
      });

      return { user, token };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        name
      });

      const { user, token } = response.data;
      
      if (!token) {
        throw new Error('No authentication token received');
      }

      setAuthState({
        user,
        token,
        loading: false,
        error: null
      });

      return { user, token };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      user: null,
      token: null,
      loading: false,
      error: null
    });
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    try {
      const response = await axios({
        url: url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  }, [logout]);

  const value = useMemo(() => ({
    user: authState.user,
    token: authState.token,
    isAuthenticated: !!authState.token,
    loading: authState.loading,
    error: authState.error,
    login,
    register,
    logout,
    authFetch
  }), [authState.user, authState.token, authState.loading, authState.error, login, register, logout, authFetch]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
