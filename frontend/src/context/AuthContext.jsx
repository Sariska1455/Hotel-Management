// ============================================================================
// Auth Context — Global authentication state for the entire app
// ============================================================================
// 💡 WHAT IS CONTEXT?
// React Context is a way to share data across your entire component tree
// without passing props down through every level ("prop drilling").
// 
// Think of it like a global store: any component anywhere in your app can
// access the current user, check if they're logged in, or call login/logout.
//
// 💡 WHY USE CONTEXT FOR AUTH?
// Authentication state is needed EVERYWHERE:
// - The Navbar needs to show the user's name
// - Route guards need to check if you're logged in
// - API calls need the token
// - Role-based UI needs to know if you're a manager or waiter
// ============================================================================

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// Step 1: Create the context (empty bucket that will hold auth data)
const AuthContext = createContext(null);

// Step 2: Custom hook — instead of useContext(AuthContext) everywhere,
// we export useAuth() which is cleaner and adds error checking
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Step 3: The Provider component — wraps the entire app and provides
// auth state + methods to all children
export const AuthProvider = ({ children }) => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [user, setUser] = useState(null);        // Current logged-in user object
  const [token, setToken] = useState(null);       // JWT token string
  const [loading, setLoading] = useState(true);   // True while checking stored auth

  // ---------------------------------------------------------------------------
  // On mount: check if user was already logged in (from a previous session)
  // ---------------------------------------------------------------------------
  // 💡 When the app loads, we check localStorage for a saved token and user.
  // This is what keeps you logged in when you refresh the page.
  // Without this, every page refresh would log you out.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        // If stored data is corrupted, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Login function
  // ---------------------------------------------------------------------------
  // 💡 Flow: 
  // 1. Send email + password to backend
  // 2. Backend validates, returns JWT token + user data
  // 3. We store both in state (for React to use) AND localStorage (for persistence)
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data.data;
    
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return userData;
  };

  // ---------------------------------------------------------------------------
  // Register function
  // ---------------------------------------------------------------------------
  const register = async (email, password, name, role) => {
    const response = await api.post('/auth/register', { email, password, name, role });
    const { token: newToken, user: userData } = response.data.data;
    
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return userData;
  };

  // ---------------------------------------------------------------------------
  // Logout function
  // ---------------------------------------------------------------------------
  // 💡 JWT is "stateless" — there's no server-side session to destroy.
  // Logging out just means removing the token from the client.
  // The token technically still works until it expires, but without it 
  // stored anywhere, the user can't send it with requests.
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const isAuthenticated = !!token;
  const isManager = user?.role === 'manager';
  const isWaiter = user?.role === 'waiter';

  // ---------------------------------------------------------------------------
  // Provide everything to children
  // ---------------------------------------------------------------------------
  // 💡 Every value listed here is accessible via useAuth() in any component:
  //   const { user, isManager, login, logout } = useAuth();
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
