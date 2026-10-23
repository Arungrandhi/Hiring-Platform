import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on startup
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = sessionStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await axiosClient.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            sessionStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('[Auth Error] Token verification failed:', err.message);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    verifyAuth();

    // Listen to unauthorized events from axiosClient interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data;
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await axiosClient.post('/auth/register', formData);
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data;
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (e) {
      // ignore server logout errors
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        role: user?.role || null,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
