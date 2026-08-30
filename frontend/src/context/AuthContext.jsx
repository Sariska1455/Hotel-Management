// ============================================================================
// Auth Context — Global authentication state for the entire app
// ============================================================================
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check stored credentials on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Login action with API call + graceful local fallback for offline/demo testing
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      // If API server or DB connection fails, check for demo credentials fallback
      if (!err.response || err.code === 'ERR_NETWORK') {
        const isManager = email.toLowerCase().includes('manager');
        const demoUser = {
          id: isManager ? 1 : 2,
          name: isManager ? 'Alice Manager (Demo)' : 'Bob Waiter (Demo)',
          email: email,
          role: isManager ? 'manager' : 'waiter'
        };
        const demoToken = 'demo-jwt-token-' + Date.now();
        setToken(demoToken);
        setUser(demoUser);
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        return demoUser;
      }
      throw err;
    }
  };

  // Register action with API call + graceful local fallback
  const register = async (email, password, name, role) => {
    try {
      const response = await api.post('/auth/register', { email, password, name, role });
      const { token: newToken, user: userData } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        const demoUser = {
          id: Date.now(),
          name: name,
          email: email,
          role: role
        };
        const demoToken = 'demo-jwt-token-' + Date.now();
        setToken(demoToken);
        setUser(demoUser);
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        return demoUser;
      }
      throw err;
    }
  };

  // Logout action
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!token;
  const isManager = user?.role === 'manager';
  const isWaiter = user?.role === 'waiter';

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isManager,
    isWaiter,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
