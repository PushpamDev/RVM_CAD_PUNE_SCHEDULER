
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          console.error('Token expired');
          throw new Error('Token expired');
        }
        const id = payload.role === 'faculty' ? payload.id : payload.userId;
        setUser({ role: payload.role, id });
      } catch (e) {
        console.error('Invalid or expired token');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        navigate('/login');
      }
    } else {
        setUser(null);
    }
    setLoading(false);
  }, [token, navigate]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  useEffect(() => {
    const interceptor = (event) => {
      if (event.detail.status === 401) {
        logout();
      }
    };
    window.addEventListener('unauthorized', interceptor);
    return () => {
      window.removeEventListener('unauthorized', interceptor);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);