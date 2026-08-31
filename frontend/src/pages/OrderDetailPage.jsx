// ============================================================================
// OrderDetailPage — Full order view: lines, lifecycle transitions, timeline (Goals 3,4,5,9)
// ============================================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { menuService } from '../services/menuService';
import StatusBadge from '../components/StatusBadge';
import VoidLineModal from '../components/VoidLineModal';
import {
  ArrowLeft, Plus, Trash2, Users, MessageSquare,
  Clock, CheckCircle2, XCircle, ArrowRight, Download,
  UserPlus, UserMinus, Edit2, AlertTriangle, IndianRupee,
  History, Shield, UserCheck, Archive, RotateCcw,
} from 'lucide-react';

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val));

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DEMO_WAITERS = [
  { id: 1, name: 'Alice Manager', role: 'manager' },
  { id: 2, name: 'Bob Waiter', role: 'waiter' },
  { id: 3, name: 'Carol Waiter', role: 'waiter' },
  { id: 4, name: 'David Waiter', role: 'waiter' },
];

const TimelineIcon = ({ type }) => {
  switch (type) {
    case 'status_change': return <ArrowRight size={14} />;
    case 'line_added': return <Plus size={14} />;
    case 'line_voided': return <Trash2 size={14} />;
    case 'collaborator_added': return <UserPlus size={14} />;
    case 'note_added': return <MessageSquare size={14} />;
    default: return <Clock size={14} />;
  }
};

const TimelineEntry = ({ entry }) => {
  let content;
  switch (entry.type) {
    case 'status_change':
      content = (
        <span>
          {entry.oldStatus
            ? <><StatusBadge status={entry.oldStatus} size="sm" /> → <StatusBadge status={entry.newStatus} size="sm" /></>
            : <><StatusBadge status={entry.newStatus} size="sm" /> <span style={{ color: 'var(--text-muted)' }}>(Order created)</span></>
          }
        </span>
      );
      break;
    case 'line_added':
      content = <span>Added <strong>{entry.lineName}</strong> × {entry.quantity}</span>;
      break;
    case 'line_voided':
      content = <span>Voided <strong>{entry.lineName}</strong> — <em style={{ color: '#f87171' }}>{entry.reason}</em></span>;
      break;
    case 'collaborator_added':
      content = <span>Added <strong>{entry.collaboratorName}</strong> as collaborator</span>;
      break;
    case 'note_added':
      content = <span>Note: <em>"{entry.note}"</em></span>;
      break;
    default:
      content = <span>{entry.type}</span>;
  }

  return (
    <div className="timeline-entry">
      <div className="timeline-dot">
        <TimelineIcon type={entry.type} />
      </div>
      <div className="timeline-body">
        <div className="timeline-content">{content}</div>
        <div className="timeline-meta">
          by <strong>{entry.actorName}</strong> · {formatTime(entry.timestamp)}
        </div>
      </div>
    </div>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Add line state
  const [showAddLine, setShowAddLine] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [addLineItem, setAddLineItem] = useState('');
  const [addLineQty, setAddLineQty] = useState(1);
  const [addLineNote, setAddLineNote] = useState('');

  // Void state
  const [voidLine, setVoidLine] = useState(null);

  // Collaborator state
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [collabWaiterId, setCollabWaiterId] = useState('');

  // Note state
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadOrder();
    menuService.getMenuItems({ includeArchived: false }).then(items => {
      setMenuItems(items.filter(i => i.is_available));
    });
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const o = await orderService.getOrderById(id);
      setOrder(o);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canAct = () => {
    if (!order) return false;
    if (isManager) return true;
    if (order.primaryWaiterId === user?.id) return true;
    if (order.collaborators?.some(c => c.id === user?.id)) return true;
    return false;
  };

  const handleAdvanceStatus = async (newStatus) => {
    setActionLoading(true);
    setError('');
    try {
      const updated = await orderService.advanceStatus(order.id, newStatus, user);
      setOrder(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLine = async () => {
    if (!addLineItem) return;
    const item = menuItems.find(i => String(i.id) === String(addLineItem));
    if (!item) return;
    setActionLoading(true);
    try {
      const updated = await orderService.addLine(order.id, {
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: Number(addLineQty),
        specialInstructions: addLineNote,
        price: item.price,
      }, user);
      setOrder(updated);
      setShowAddLine(false);
      setAddLineItem('');
      setAddLineQty(1);
      setAddLineNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCollab = async () => {
    if (!collabWaiterId) return;
    const waiter = DEMO_WAITERS.find(w => String(w.id) === String(collabWaiterId));
    if (!waiter) return;
    setActionLoading(true);
    try {
      const updated = await orderService.addCollaborator(order.id, { id: waiter.id, name: waiter.name }, user);
      setOrder({ ...updated, total: order.total });
      setShowAddCollab(false);
      setCollabWaiterId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCollab = async (collabId) => {
    setActionLoading(true);
    try {
      const updated = await orderService.removeCollaborator(order.id, collabId, user);
      setOrder({ ...updated, total: order.total });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setActionLoading(true);
    try {
      const updated = await orderService.addNote(order.id, noteText, user);
      setOrder({ ...updated, total: order.total });
      setShowAddNote(false);
      setNoteText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      await orderService.archiveOrder(order.id, !order.archived, user);
      setOrder(prev => ({ ...prev, archived: !prev.archived }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const validTransitions = order ? orderService.getValidTransitions(order.status) : [];
  const isOpen = order && !['Served', 'Cancelled'].includes(order.status);

  if (loading) {
    return (
      <div className="loading-center" style={{ padding: '6rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertTriangle size={40} />
          <h3>Order Not Found</h3>
          <button className="btn-primary" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back */}
      <button className="back-btn" onClick={() => navigate('/orders')}>
        <ArrowLeft size={18} /> Back to Orders
      </button>

      {/* Order Header */}
      <div className="order-detail-header">
        <div>
          <div className="page-eyebrow">
            Order #{order.id}
            {order.archived && <span className="archived-tag">Archived</span>}
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            Table {order.tableNumber}
            <StatusBadge status={order.status} size="lg" />
          </h1>
          <p className="page-subtitle">Placed {formatTime(order.createdAt)}</p>
        </div>

        <div className="header-actions">
          {isManager && (
            <button className="btn-ghost" onClick={handleArchive} disabled={actionLoading}>
              {order.archived ? <><RotateCcw size={16} /> Restore</> : <><Archive size={16} /> Archive</>}
            </button>
          )}
          {/* Status Transitions */}
          {canAct() && validTransitions.map(next => (
            <button
              key={next}
              className={`btn-transition btn-transition-${next.toLowerCase()}`}
              onClick={() => handleAdvanceStatus(next)}
              disabled={actionLoading}
            >
              {actionLoading ? <div className="spinner spinner-sm" /> : (
                next === 'Cancelled' ? <><XCircle size={16} /> Cancel</> :
                next === 'Served' ? <><CheckCircle2 size={16} /> Mark Served</> :
                <><ArrowRight size={16} /> {next}</>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto' }}>×</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="order-detail-grid">
        {/* Left Column */}
        <div className="order-detail-left">
          {/* Order Lines */}
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Order Lines</h2>
              {isOpen && canAct() && (
                <button className="btn-ghost-sm" onClick={() => setShowAddLine(!showAddLine)}>
                  <Plus size={14} /> Add Item
                </button>
              )}
            </div>

            {/* Add Line Form */}
            {showAddLine && (
              <div className="add-line-form">
                <select
                  className="custom-input"
                  value={addLineItem}
                  onChange={e => setAddLineItem(e.target.value)}
                  style={{ paddingLeft: '14px', marginBottom: '8px' }}
                >
                  <option value="">Select menu item...</option>
                  {menuItems.map(i => (
                    <option key={i.id} value={i.id}>{i.name} — {formatINR(i.price)}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    className="custom-input"
                    value={addLineQty}
                    onChange={e => setAddLineQty(e.target.value)}
                    placeholder="Qty"
                    style={{ paddingLeft: '14px', maxWidth: '80px' }}
                  />
                  <input
                    type="text"
                    className="custom-input"
                    value={addLineNote}
                    onChange={e => setAddLineNote(e.target.value)}
                    placeholder="Special instructions..."
                    style={{ paddingLeft: '14px', flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost-sm" onClick={() => setShowAddLine(false)}>Cancel</button>
                  <button className="btn-primary-sm" onClick={handleAddLine} disabled={actionLoading}>
                    Add Line
                  </button>
                </div>
              </div>
            )}

            {/* Lines list */}
            <div className="lines-list">
              {order.lines.map(line => (
                <div key={line.id} className={`line-item ${line.status === 'void' ? 'line-voided' : ''}`}>
                  <div className="line-info">
                    <div className="line-name">
                      {line.status === 'void' && <span className="void-tag">VOID</span>}
                      {line.menuItemName}
                      {line.specialInstructions && (
                        <span className="line-instructions-tag">{line.specialInstructions}</span>
                      )}
                    </div>
                    <div className="line-meta">
                      {line.quantity} × {formatINR(line.priceAtTime)}
                      {line.status === 'void' && line.voidReason && (
                        <span className="void-reason"> — {line.voidReason}</span>
                      )}
                    </div>
                  </div>
                  <div className="line-right">
                    {line.status !== 'void' && (
                      <span className="line-total">{formatINR(line.priceAtTime * line.quantity)}</span>
                    )}
                    {isOpen && canAct() && line.status !== 'void' && (
                      <button className="void-btn" onClick={() => setVoidLine(line)} title="Void this line">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="order-total-footer">
              <IndianRupee size={16} />
              <span>Order Total</span>
              <span className="order-total-big">{formatINR(order.total || 0)}</span>
            </div>
          </div>

          {/* Collaborators */}
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title"><Users size={16} /> Team</h2>
              {canAct() && (
                <button className="btn-ghost-sm" onClick={() => setShowAddCollab(!showAddCollab)}>
                  <UserPlus size={14} /> Add Collaborator
                </button>
              )}
            </div>

            {showAddCollab && (
              <div className="add-line-form">
                <select
                  className="custom-input"
                  value={collabWaiterId}
                  onChange={e => setCollabWaiterId(e.target.value)}
                  style={{ paddingLeft: '14px', marginBottom: '8px' }}
                >
                  <option value="">Select waiter...</option>
                  {DEMO_WAITERS
                    .filter(w => w.id !== order.primaryWaiterId && !order.collaborators?.some(c => c.id === w.id))
                    .map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost-sm" onClick={() => setShowAddCollab(false)}>Cancel</button>
                  <button className="btn-primary-sm" onClick={handleAddCollab} disabled={actionLoading}>Add</button>
                </div>
              </div>
            )}

            <div className="team-list">
              <div className="team-member">
                <div className="team-avatar primary">
                  {order.primaryWaiterName?.charAt(0)}
                </div>
                <div>
                  <div className="team-name">{order.primaryWaiterName}</div>
                  <div className="team-role">Primary Waiter</div>
                </div>
              </div>
              {order.collaborators?.map(c => (
                <div key={c.id} className="team-member">
                  <div className="team-avatar collab">
                    {c.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="team-name">{c.name}</div>
                    <div className="team-role">Collaborator</div>
                  </div>
                  {canAct() && (
                    <button className="team-remove-btn" onClick={() => handleRemoveCollab(c.id)}>
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Timeline */}
        <div className="order-detail-right">
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title"><History size={16} /> Order Timeline</h2>
              {canAct() && (
                <button className="btn-ghost-sm" onClick={() => setShowAddNote(!showAddNote)}>
                  <Edit2 size={14} /> Add Note
                </button>
              )}
            </div>

            {showAddNote && (
              <div className="add-line-form">
                <textarea
                  className="custom-input"
                  rows={3}
                  placeholder="Leave a note on this order..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  style={{ paddingLeft: '14px', resize: 'none', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost-sm" onClick={() => setShowAddNote(false)}>Cancel</button>
                  <button className="btn-primary-sm" onClick={handleAddNote} disabled={actionLoading}>Save Note</button>
                </div>
              </div>
            )}

            <div className="timeline-list">
              {[...order.timeline].reverse().map(entry => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>

            <div className="timeline-immutable-notice">
              <Shield size={12} />
              <span>Timeline events are immutable and cannot be edited or deleted.</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="detail-card notes-card">
              <h2 className="detail-card-title"><MessageSquare size={16} /> Notes</h2>
              <p className="notes-text">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Void Modal */}
      {voidLine && (
        <VoidLineModal
          orderId={order.id}
          line={voidLine}
          onClose={() => setVoidLine(null)}
          onVoided={updated => { setOrder(updated); setVoidLine(null); }}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
