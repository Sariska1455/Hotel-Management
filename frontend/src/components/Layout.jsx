// ============================================================================
// Layout — Sidebar navigation shell with alert badge & role-aware links
// ============================================================================
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Bell,
  LogOut,
  Shield,
  UserCheck,
  Utensils,
  Menu,
  X,
  Crown,
  Users,
  ChevronRight,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, isManager, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      try {
        const alerts = await orderService.getSlowOrders();
        setAlertCount(alerts.length);
      } catch (err) {
        // Silently fail — don't block layout rendering
      }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/orders', label: 'Orders', icon: <ClipboardList size={18} /> },
    { to: '/menu', label: 'Menu & Dishes', icon: <BookOpen size={18} /> },
    ...(isAdmin ? [{ to: '/staff', label: 'Staff Management', icon: <Users size={18} /> }] : []),
  ];

  return (
    <div className="layout-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Utensils size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Restora</span>
            <span className="brand-sub">Restaurant System</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User profile */}
        <div className="sidebar-profile">
          <div className="profile-avatar" style={isAdmin ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' } : {}}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.name || 'User'}</div>
            <div className="profile-role">
              {isAdmin ? (
                <>
                  <Crown size={11} color="#34d399" />
                  <span style={{ color: '#34d399' }}>Owner / Admin</span>
                </>
              ) : isManager ? (
                <>
                  <Shield size={11} color="#c084fc" />
                  <span style={{ color: '#c084fc' }}>Manager</span>
                </>
              ) : (
                <>
                  <UserCheck size={11} color="#fbbf24" />
                  <span style={{ color: '#fbbf24' }}>Waiter</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="link-icon">{link.icon}</span>
              <span className="link-label">{link.label}</span>
              <ChevronRight size={14} className="link-arrow" />
            </NavLink>
          ))}

          {/* Alerts Link */}
          <NavLink
            to="/alerts"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${alertCount > 0 ? 'has-alert' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="link-icon">
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="alert-dot">{alertCount}</span>
              )}
            </span>
            <span className="link-label">
              Slow Order Alerts
              {alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
            </span>
            <ChevronRight size={14} className="link-arrow" />
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="layout-main">
        {/* Top bar (mobile) */}
        <header className="topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-brand">
            <Utensils size={16} />
            <span>Restora</span>
          </div>
          <NavLink to="/alerts" className="topbar-alert-btn">
            <Bell size={20} />
            {alertCount > 0 && <span className="topbar-alert-dot">{alertCount}</span>}
          </NavLink>
        </header>

        {/* Page content */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
