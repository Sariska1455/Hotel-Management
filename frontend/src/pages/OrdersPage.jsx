// ============================================================================
// OrdersPage — Full order list with search, filters, sort, pagination (Goal 6)
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import StatusBadge from '../components/StatusBadge';
import CreateOrderModal from '../components/CreateOrderModal';
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  ClipboardList, Calendar, ArrowUpDown, Download,
  SortAsc, SortDesc, RefreshCw, Table2, Shield,
} from 'lucide-react';

const STATUSES = ['All', 'Placed', 'Accepted', 'Preparing', 'Ready', 'Served', 'Cancelled'];
const PAGE_SIZE = 8;
const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val));

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const OrdersPage = () => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [date, setDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  // Data
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await orderService.getOrders({
        page,
        pageSize: PAGE_SIZE,
        search,
        status,
        date,
        sortBy,
        sortDir,
        waiterId: isManager ? '' : String(user?.id || ''),
      });
      setOrders(result.orders);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, date, sortBy, sortDir, isManager, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, status, date, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={14} opacity={0.4} />;
    return sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <ClipboardList size={14} />
            <span>{isManager ? 'All Orders' : 'My Orders'}</span>
          </div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">
            {isManager
              ? 'All active and historical orders across the restaurant'
              : 'Orders where you are the primary waiter or collaborator'}
          </p>
        </div>
        <div className="header-actions">
          {isManager && (
            <button className="btn-ghost" onClick={() => orderService.exportOrdersCSV()}>
              <Download size={16} />
              Export CSV
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Order
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        {/* Search */}
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search table, waiter, order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status tabs */}
        <div className="status-tabs">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`status-tab ${status === s ? 'active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Date filter & sort */}
        <div className="filter-extra">
          <input
            type="date"
            className="date-picker"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          {date && (
            <button className="btn-ghost-sm" onClick={() => setDate('')}>Clear Date</button>
          )}
          <button className="btn-ghost-sm" onClick={fetchOrders}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        {loading ? 'Loading...' : `${total} order${total !== 1 ? 's' : ''} found`}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="loading-center" style={{ padding: '4rem' }}>
          <div className="spinner" style={{ width: '36px', height: '36px' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Fetching orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <ClipboardList size={36} />
          </div>
          <h3>No Orders Found</h3>
          <p>Try clearing your filters or create a new order.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Order
          </button>
        </div>
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('tableNumber')}>
                    <Table2 size={14} /> Table <SortIcon field="tableNumber" />
                  </button>
                </th>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('status')}>
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th>Waiter</th>
                <th>Lines</th>
                <th>Total</th>
                <th>
                  <button className="sort-btn" onClick={() => toggleSort('createdAt')}>
                    Placed At <SortIcon field="createdAt" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr
                  key={order.id}
                  className="order-row"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td>
                    <div className="table-cell-main">
                      Table <strong>{order.tableNumber}</strong>
                    </div>
                    <div className="table-cell-sub">{order.id}</div>
                  </td>
                  <td><StatusBadge status={order.status} size="sm" /></td>
                  <td>
                    <div className="waiter-cell">
                      <div className="waiter-avatar-sm">
                        {order.primaryWaiterName?.charAt(0) || 'W'}
                      </div>
                      <div>
                        <div className="table-cell-main">{order.primaryWaiterName}</div>
                        {order.collaborators?.length > 0 && (
                          <div className="table-cell-sub">+{order.collaborators.length} collab</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="line-pill">
                      {order.lines?.filter(l => l.status !== 'void').length || 0} items
                    </span>
                  </td>
                  <td>
                    <span className="amount-cell">{formatINR(order.total || 0)}</span>
                  </td>
                  <td>
                    <div className="table-cell-main">{formatTime(order.createdAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <span className="page-info">Page {page} of {totalPages} • {total} total</span>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchOrders()}
        />
      )}
    </div>
  );
};

export default OrdersPage;
