import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser({ role: data.role, faculty_id: data.faculty_id, username: data.username });
        // Store metadata for UI persistency, but actual auth depends on cookie
        localStorage.setItem('role', data.role);
        localStorage.setItem('faculty_id', data.faculty_id);
        localStorage.setItem('username', data.username);
      } catch (err) {
        localStorage.removeItem('role');
        localStorage.removeItem('faculty_id');
        localStorage.removeItem('username');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('role', data.role);
    localStorage.setItem('faculty_id', data.faculty_id);
    localStorage.setItem('username', data.username);
    setUser({ role: data.role, faculty_id: data.faculty_id, username: data.username });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('role');
      localStorage.removeItem('faculty_id');
      localStorage.removeItem('username');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
