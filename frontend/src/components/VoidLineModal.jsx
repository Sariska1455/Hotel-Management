// ============================================================================
// VoidLineModal — Void an order line with required reason (Goal 4)
// ============================================================================
import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { orderService } from '../services/orderService';

const VoidLineModal = ({ orderId, line, onClose, onVoided }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVoid = async () => {
    if (!reason.trim()) {
      setError('A reason is required to void this item.');
      return;
    }
    setLoading(true);
    try {
      const updated = await orderService.voidLine(orderId, line.id, reason);
      onVoided(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow" style={{ color: '#f87171' }}>
              <AlertTriangle size={14} /> Void Line Item
            </div>
            <h2 className="modal-title">Void: {line.menuItemName}</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={22} /></button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This will mark the line as <strong style={{ color: '#f87171' }}>Void</strong>. 
          The record is preserved in the order history. A reason is required.
        </p>

        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Void Reason *</label>
          <textarea
            className="custom-input"
            rows={3}
            placeholder="e.g. Guest changed mind, Out of stock, Duplicate entry..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ paddingLeft: '14px', resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              color: 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleVoid}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? <div className="spinner" /> : <><Trash2 size={16} /> Void Item</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoidLineModal;
