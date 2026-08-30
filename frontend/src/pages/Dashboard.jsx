// ============================================================================
// Main Dashboard Landing Page
// ============================================================================
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Utensils, 
  Shield, 
  Clock, 
  ShoppingBag, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  UserCheck
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout, isManager } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      
      {/* Navbar Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#ffffff' }}>
              {user?.name || 'Restaurant User'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isManager ? <Shield size={12} color="#8b5cf6" /> : <Utensils size={12} color="#f59e0b" />}
              <span style={{ textTransform: 'capitalize' }}>{user?.role}</span> • {user?.email}
            </div>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Sign Out
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyConstraint: 'space-between',
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
              {isManager ? 'Manager Workspace' : 'Waiter Workspace'}
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: '700', color: '#ffffff' }}>
              Welcome back, {user?.name}! 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              {isManager 
                ? 'Full system overview. You can manage menu items, set prices, and act on all active orders.' 
                : 'Your live orders queue. Create new table orders and track their progress from kitchen to server.'}
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
          
          {/* Card 1: Active Open Orders */}
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

          {/* Card 2: Today's Placed */}
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

          {/* Card 3: Served Today */}
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

          {/* Card 4: Revenue */}
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
                <DollarSign size={20} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>$0.00</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Calculated from served lines</div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Dashboard;
