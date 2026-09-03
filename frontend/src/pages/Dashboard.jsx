// ============================================================================
// Main Dashboard & Bistro Workspace
// ============================================================================
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MenuManager from '../components/MenuManager';
import { 
  LogOut, 
  Utensils, 
  Shield, 
  Clock, 
  ShoppingBag, 
  CheckCircle, 
  IndianRupee,
  UserCheck,
  BookOpen,
  LayoutDashboard,
  Bell
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout, isManager } = useAuth();
  
  // Navigation Tab State: 'overview' | 'menu'
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      
      {/* Navbar Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '800'
            }}>
              <Utensils size={20} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: '700', fontSize: '1.15rem', color: '#ffffff' }}>
                Restora
              </div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#fbbf24', fontWeight: '600' }}>
                Restaurant System
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('menu')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                border: 'none',
                background: activeTab === 'menu' ? 'rgba(217, 119, 6, 0.2)' : 'transparent',
                color: activeTab === 'menu' ? '#fbbf24' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <BookOpen size={16} />
              <span>Menu & Dishes</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                border: 'none',
                background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'overview' ? '#818cf8' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard Overview</span>
            </button>
          </nav>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#ffffff' }}>
                {user?.name || 'Restaurant User'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                {isManager ? <Shield size={12} color="#8b5cf6" /> : <UserCheck size={12} color="#f59e0b" />}
                <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              </div>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {activeTab === 'menu' ? (
          <MenuManager />
        ) : (
          <div>
            {/* Welcome Section */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  background: isManager ? 'rgba(139, 92, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: isManager ? '#a78bfa' : '#fbbf24',
                  marginBottom: '8px'
                }}>
                  {isManager ? <Shield size={14} /> : <UserCheck size={14} />}
                  {isManager ? 'Manager Executive View' : 'Waiter Floor View'}
                </span>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: '700', color: '#ffffff' }}>
                  Welcome back, {user?.name}! 👋
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                  {isManager 
                    ? 'Full bistro system overview. Manage active table tickets, monitor sales, or edit dish prices.' 
                    : 'Your live floor queue. Place new orders for tables and track kitchen progress.'}
                </p>
              </div>
            </div>

            {/* Quick Stat Cards Preview */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '1rem' }}>
              Overview Highlights
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2.5rem'
            }}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Open Orders</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Clock size={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>0</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Currently in kitchen pipeline</div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Orders Today</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    <ShoppingBag size={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>0</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Placed since 12:00 AM</div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Served Today</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <CheckCircle size={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>0</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Successfully delivered</div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Today's Revenue</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                    <IndianRupee size={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>₹0.00</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Calculated from served lines</div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
