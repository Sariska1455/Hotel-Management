// ============================================================================
// Dashboard Page — Headline stats, status breakdown, waiter table, 14-day chart (Goal 8)
// ============================================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  Clock, ShoppingBag, CheckCircle, IndianRupee,
  TrendingUp, Users, Shield, UserCheck, BarChart2,
  RefreshCw,
} from 'lucide-react';

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val));

const STATUS_COLORS = {
  Placed: '#6366f1',
  Accepted: '#f59e0b',
  Preparing: '#f97316',
  Ready: '#10b981',
  Served: '#64748b',
  Cancelled: '#ef4444',
};

const StatCard = ({ icon, label, value, sub, color, loading }) => (
  <div className="stat-card">
    <div className="stat-card-top">
      <div className="stat-label">{label}</div>
      <div className="stat-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
    </div>
    {loading ? (
      <div className="stat-skeleton" />
    ) : (
      <>
        <div className="stat-value">{value}</div>
        <div className="stat-sub">{sub}</div>
      </>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <strong>
            {p.name === 'Revenue' ? formatINR(p.value) : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

const DashboardPage = () => {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('orders'); // 'orders' | 'revenue'

  const load = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            {isManager ? <><Shield size={14} /> Manager View</> : <><UserCheck size={14} /> Waiter View</>}
          </div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">
            {isManager
              ? 'Full restaurant overview — orders, revenue, and kitchen performance.'
              : 'Your live floor queue and today\'s highlights.'}
          </p>
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={<Clock size={20} />}
          label="Open Orders"
          value={stats?.openOrders ?? '—'}
          sub="Currently in pipeline"
          color="#f59e0b"
          loading={loading}
        />
        <StatCard
          icon={<ShoppingBag size={20} />}
          label="Orders Today"
          value={stats?.ordersToday ?? '—'}
          sub="Placed since midnight"
          color="#6366f1"
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Served Today"
          value={stats?.servedToday ?? '—'}
          sub="Successfully delivered"
          color="#10b981"
          loading={loading}
        />
        <StatCard
          icon={<IndianRupee size={20} />}
          label="Revenue Today"
          value={stats ? formatINR(stats.revenueToday) : '—'}
          sub="From served orders"
          color="#ec4899"
          loading={loading}
        />
      </div>

      {/* Chart + Status breakdown */}
      <div className="dashboard-main-grid">
        {/* 14-Day Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h2 className="detail-card-title"><BarChart2 size={16} /> 14-Day Performance</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Orders served & revenue over the past two weeks
              </p>
            </div>
            <div className="chart-toggle">
              <button
                className={`chart-toggle-btn ${chartType === 'orders' ? 'active' : ''}`}
                onClick={() => setChartType('orders')}
              >
                Orders
              </button>
              <button
                className={`chart-toggle-btn ${chartType === 'revenue' ? 'active' : ''}`}
                onClick={() => setChartType('revenue')}
              >
                Revenue
              </button>
            </div>
          </div>

          {loading || !stats ? (
            <div className="chart-skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartType === 'orders' ? '#6366f1' : '#ec4899'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartType === 'orders' ? '#6366f1' : '#ec4899'} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => chartType === 'revenue' ? `₹${(v/1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={chartType === 'orders' ? 'served' : 'revenue'}
                  name={chartType === 'orders' ? 'Served' : 'Revenue'}
                  stroke={chartType === 'orders' ? '#6366f1' : '#ec4899'}
                  fill="url(#chartGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: chartType === 'orders' ? '#6366f1' : '#ec4899', r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="status-breakdown-card">
          <h2 className="detail-card-title">Orders by Status</h2>
          {loading || !stats ? (
            <div style={{ padding: '2rem 0' }}>
              {[1,2,3,4].map(i => <div key={i} className="stat-skeleton" style={{ marginBottom: '8px' }} />)}
            </div>
          ) : (
            <div className="status-breakdown-list">
              {Object.entries(stats.statusCounts).map(([s, count]) => {
                const total = Object.values(stats.statusCounts).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={s} className="status-breakdown-row">
                    <div className="status-breakdown-label">
                      <span
                        className="status-dot"
                        style={{ background: STATUS_COLORS[s] || '#94a3b8' }}
                      />
                      {s}
                    </div>
                    <div className="status-breakdown-bar-wrap">
                      <div
                        className="status-breakdown-bar"
                        style={{
                          width: `${pct}%`,
                          background: STATUS_COLORS[s] || '#94a3b8',
                        }}
                      />
                    </div>
                    <span className="status-breakdown-count">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Waiter Leaderboard */}
      {isManager && (
        <div className="detail-card" style={{ marginTop: '1.5rem' }}>
          <div className="detail-card-header">
            <h2 className="detail-card-title"><Users size={16} /> Waiter Performance</h2>
          </div>
          {loading || !stats ? (
            <div className="stat-skeleton" style={{ height: '120px' }} />
          ) : (
            <div className="waiter-table-wrap">
              <table className="waiter-table">
                <thead>
                  <tr>
                    <th>Waiter</th>
                    <th>Total Orders</th>
                    <th>Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.waiterBreakdown
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((w, i) => (
                      <tr key={w.name}>
                        <td>
                          <div className="waiter-cell">
                            <div className={`waiter-avatar-sm ${i === 0 ? 'top-waiter' : ''}`}>
                              {w.name.charAt(0)}
                            </div>
                            {w.name}
                            {i === 0 && <span className="top-badge">⭐ Top</span>}
                          </div>
                        </td>
                        <td><span className="line-pill">{w.orders}</span></td>
                        <td><span className="amount-cell">{formatINR(w.revenue)}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
