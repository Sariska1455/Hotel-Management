// ============================================================================
// Login Page Component — Waiter, Manager & Admin Authentication
// ============================================================================
// Public registration and demo logins are disabled. All staff credentials are
// provisioned and managed by the restaurant Administrator / Owner.
// ============================================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Login Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirect on successful authentication
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please check your email and password.';
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

      {/* Main Auth Card */}
      <div className="auth-card">
        
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="brand-badge">
            <Sparkles size={14} />
            <span>Restora RMS</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in with your Waiter, Manager, or Admin credentials
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Email Field */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                className="custom-input"
                placeholder="name@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
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
                autoComplete="current-password"
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Staff Provisioning Notice */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.85rem 1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          fontSize: '0.78rem',
          color: '#94a3b8',
          lineHeight: '1.4'
        }}>
          <ShieldAlert size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px' }}>Staff Access Only</strong>
            Accounts are provisioned by the restaurant Administrator. If you need credentials, contact your Administrator.
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
