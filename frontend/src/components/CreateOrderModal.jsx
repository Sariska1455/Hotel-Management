// ============================================================================
// CreateOrderModal — New order creation with table number + menu line items
// ============================================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { menuService } from '../services/menuService';
import {
  X,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  AlertCircle,
  ShoppingCart,
  IndianRupee,
} from 'lucide-react';

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val));

const CreateOrderModal = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    menuService.getMenuItems({ includeArchived: false }).then(items => {
      setMenuItems(items.filter(i => i.is_available && !i.is_archived));
      setMenuLoading(false);
    });
  }, []);

  const addLine = (item) => {
    const existing = selectedLines.find(l => l.menuItemId === item.id);
    if (existing) {
      setSelectedLines(selectedLines.map(l =>
        l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
      ));
    } else {
      setSelectedLines([...selectedLines, {
        menuItemId: item.id,
        menuItemName: item.name,
        price: item.price,
        quantity: 1,
        specialInstructions: '',
      }]);
    }
  };

  const removeLine = (menuItemId) => {
    setSelectedLines(selectedLines.filter(l => l.menuItemId !== menuItemId));
  };

  const updateQty = (menuItemId, qty) => {
    if (qty < 1) {
      removeLine(menuItemId);
      return;
    }
    setSelectedLines(selectedLines.map(l =>
      l.menuItemId === menuItemId ? { ...l, quantity: qty } : l
    ));
  };

  const updateInstructions = (menuItemId, val) => {
    setSelectedLines(selectedLines.map(l =>
      l.menuItemId === menuItemId ? { ...l, specialInstructions: val } : l
    ));
  };

  const orderTotal = selectedLines.reduce((s, l) => s + l.price * l.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!tableNumber || isNaN(Number(tableNumber)) || Number(tableNumber) < 1) {
      setError('Please enter a valid table number.');
      return;
    }
    if (selectedLines.length === 0) {
      setError('Please add at least one menu item.');
      return;
    }
    setLoading(true);
    try {
      const created = await orderService.createOrder({
        tableNumber,
        notes,
        menuLines: selectedLines,
        currentUser: user,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-large">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow"><ShoppingCart size={14} /> New Order</div>
            <h2 className="modal-title">Create Table Order</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-body-grid">
          {/* Left: Menu items */}
          <div className="modal-menu-panel">
            <h3 className="modal-section-title">Menu Items</h3>
            {menuLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="menu-item-list">
                {menuItems.map(item => (
                  <div key={item.id} className="menu-pick-item" onClick={() => addLine(item)}>
                    <div className="menu-pick-info">
                      <div className="menu-pick-name">{item.name}</div>
                      <div className="menu-pick-cat">{item.category}</div>
                    </div>
                    <div className="menu-pick-right">
                      <span className="menu-pick-price">{formatINR(item.price)}</span>
                      <div className="menu-pick-add"><Plus size={14} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Order summary */}
          <div className="modal-order-panel">
            <form onSubmit={handleSubmit} id="create-order-form">
              <div className="input-group">
                <label className="input-label">Table Number *</label>
                <input
                  type="number"
                  min="1"
                  className="custom-input"
                  placeholder="e.g. 7"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  style={{ paddingLeft: '14px' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Notes (optional)</label>
                <textarea
                  className="custom-input"
                  rows={2}
                  placeholder="VIP table, allergy notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ paddingLeft: '14px', resize: 'none' }}
                />
              </div>

              <h3 className="modal-section-title" style={{ marginTop: '0.5rem' }}>
                Order Lines {selectedLines.length > 0 && <span className="line-count">{selectedLines.length}</span>}
              </h3>

              {selectedLines.length === 0 ? (
                <div className="empty-lines">
                  <UtensilsCrossed size={28} color="var(--text-subtle)" />
                  <p>Click items from the menu to add them</p>
                </div>
              ) : (
                <div className="order-lines-list">
                  {selectedLines.map(line => (
                    <div key={line.menuItemId} className="order-line-row">
                      <div className="line-name">{line.menuItemName}</div>
                      <div className="line-controls">
                        <button type="button" className="qty-btn" onClick={() => updateQty(line.menuItemId, line.quantity - 1)}>
                          <Minus size={12} />
                        </button>
                        <span className="qty-value">{line.quantity}</span>
                        <button type="button" className="qty-btn" onClick={() => updateQty(line.menuItemId, line.quantity + 1)}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="line-subtotal">{formatINR(line.price * line.quantity)}</span>
                      <button type="button" className="line-remove" onClick={() => removeLine(line.menuItemId)}>
                        <Trash2 size={14} />
                      </button>
                      <input
                        type="text"
                        className="line-instructions"
                        placeholder="Special instructions..."
                        value={line.specialInstructions}
                        onChange={e => updateInstructions(line.menuItemId, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedLines.length > 0 && (
                <div className="order-total-bar">
                  <IndianRupee size={16} />
                  <span>Total</span>
                  <span className="order-total-amount">{formatINR(orderTotal)}</span>
                </div>
              )}
            </form>

            <button
              type="submit"
              form="create-order-form"
              className="submit-btn"
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {loading ? <div className="spinner" /> : <>Place Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
