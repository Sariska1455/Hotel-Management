// ============================================================================
// Protected Route Component
// ============================================================================
// 💡 WHAT DOES THIS DO?
// Restricts access to routes based on authentication status and user roles.
//
// If a user tries to access /dashboard without logging in:
// -> Redirects them to /login
//
// If a waiter tries to access a manager-only page:
// -> Redirects them to /dashboard with an unauthorized message
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show a smooth loading screen while checking stored token on initial load
  if (loading) {
    return (
      <div className="auth-bg-wrapper">
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
      </div>
    );
  }

  // Not logged in -> send to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check -> if specific roles are required, verify user has one of them
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
