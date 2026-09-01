// ============================================================================
// AlertsPanel Page — Slow order alerts with acknowledge & re-alert logic (Goal 10)
// ============================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import StatusBadge from '../components/StatusBadge';
import {
  Bell,
  BellOff,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

const formatAge = (createdAt) => {
  const now = Date.now();
  const ms = now - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
};

const AlertsPanel = () => {
  const navigate = useNavigate();
  const [slowOrders, setSlowOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const alerts = await orderService.getSlowOrders();
      setSlowOrders(alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (orderId) => {
    try {
      await orderService.acknowledgeAlert(orderId);
      refresh();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <Bell size={14} />
            <span>Alert Center</span>
          </div>
          <h1 className="page-title">Slow Order Alerts</h1>
          <p className="page-subtitle">
            Orders open for more than 30 minutes without reaching Ready status.
            Acknowledging an alert clears it for 15 minutes.
          </p>
        </div>
        {slowOrders.length > 0 && (
          <div className="alert-count-badge">
            <AlertTriangle size={20} />
            <span>{slowOrders.length} Active Alert{slowOrders.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div className="loading-center" style={{ padding: '4rem' }}>
          <div className="spinner" style={{ width: '36px', height: '36px' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Checking alerts...</p>
        </div>
      ) : slowOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap green">
            <BellOff size={36} />
          </div>
          <h3>No Slow Orders Right Now</h3>
          <p>All open orders are progressing on time. This panel refreshes every 15 seconds.</p>
          <button className="btn-outline" onClick={refresh}>
            Refresh Now
          </button>
        </div>
      ) : (
        <div className="alerts-grid">
          {slowOrders.map(order => (
            <div key={order.id} className="alert-card">
              {/* Alert header */}
              <div className="alert-card-header">
                <div className="alert-table-badge">
                  Table {order.tableNumber}
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>

              <div className="alert-card-body">
                <div className="alert-meta-row">
                  <Clock size={14} />
                  <span>Open for <strong style={{ color: '#fb923c' }}>{formatAge(order.createdAt)}</strong></span>
                </div>
                <div className="alert-meta-row">
                  <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                    Waiter: {order.primaryWaiterName}
                  </span>
                </div>
                <div className="alert-meta-row">
                  <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                    {order.lines?.filter(l => l.status !== 'void').length || 0} active line(s)
                  </span>
                </div>
              </div>

              <div className="alert-card-actions">
                <button
                  className="btn-ghost-sm"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <ExternalLink size={14} />
                  View Order
                </button>
                <button
                  className="btn-acknowledge"
                  onClick={() => handleAcknowledge(order.id)}
                >
                  <CheckCircle size={14} />
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
