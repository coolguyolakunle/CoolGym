import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password, remember) => {
    const data = await api.post('/api/auth/login', { email, password, remember });
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.post('/api/auth/register', payload);
    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential) => {
    const data = await api.post('/api/auth/google', { credential });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      // Clear the UI session even if the server session has already expired.
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, googleLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
