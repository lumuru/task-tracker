import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, clearToken } from '../api/base';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate existing token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const changePassword = async (oldPassword, newPassword) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }

    // Update token if returned
    if (data.token) {
      setToken(data.token);
      setUser((prev) => ({ ...prev, must_change_password: false }));
    }

    return data;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
