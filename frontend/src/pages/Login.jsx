// ============================================================================
// Login & Registration Page Component
// ============================================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  UtensilsCrossed, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // Mode: 'login' | 'register'
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter'); // default role

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Toggle Tab
  const handleTabSwitch = (mode) => {
    setIsRegisterMode(mode === 'register');
    setError('');
  };

  // Demo Account Quick Fill
  const fillDemoAccount = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('password123');
    setRole(demoRole);
    if (isRegisterMode) {
      setName(demoRole === 'manager' ? 'Alice Manager' : 'Bob Waiter');
    }
    setError('');
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        await register(email, password, name, role);
      } else {
        await login(email, password);
      }
      // Redirect on success
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg-wrapper">
      {/* Background Animated Ambient Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      {/* Main Auth Glass Card */}
      <div className="auth-card">
        
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="brand-badge">
            <Sparkles size={14} />
            <span>CorkBoard RMS</span>
          </div>
          <h1 className="auth-title">
            {isRegisterMode ? 'Join the Team' : 'Welcome Back'}
          </h1>
          <p className="auth-subtitle">
            {isRegisterMode 
              ? 'Create an account to start managing restaurant orders' 
              : 'Sign in to access your orders and kitchen workflow'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`tab-btn ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegisterMode ? 'active' : ''}`}
            onClick={() => handleTabSwitch('register')}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Name Field (Only in Register mode) */}
          {isRegisterMode && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="custom-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegisterMode}
                />
                <User size={18} className="input-icon" />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                className="custom-input"
                placeholder="waiter@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className="input-icon" />
            </div>
          </div>

          {/* Password Field */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="custom-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection (Only in Register mode) */}
          {isRegisterMode && (
            <div>
              <span className="role-selector-label">Select Your Role</span>
              <div className="role-grid">
                <div
                  className={`role-card ${role === 'waiter' ? 'selected' : ''}`}
                  onClick={() => setRole('waiter')}
                >
                  <UtensilsCrossed size={22} color={role === 'waiter' ? '#818cf8' : '#94a3b8'} />
                  <span className="role-title">Waiter</span>
                  <span className="role-desc">Create & track table orders</span>
                </div>

                <div
                  className={`role-card ${role === 'manager' ? 'selected' : ''}`}
                  onClick={() => setRole('manager')}
                >
                  <ShieldCheck size={22} color={role === 'manager' ? '#818cf8' : '#94a3b8'} />
                  <span className="role-title">Manager</span>
                  <span className="role-desc">Manage menu, prices & analytics</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Fill (Great for testing & reviewer evaluation) */}
        <div className="demo-accounts">
          <div className="demo-title">Quick Demo Login</div>
          <div className="demo-pills">
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillDemoAccount('manager@restaurant.com', 'manager')}
            >
              <ShieldCheck size={14} color="#8b5cf6" />
              <span>Manager Demo</span>
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillDemoAccount('waiter@restaurant.com', 'waiter')}
            >
              <UtensilsCrossed size={14} color="#f59e0b" />
              <span>Waiter Demo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
