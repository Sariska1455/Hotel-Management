// ============================================================================
// Order Service — Full lifecycle management with localStorage demo fallback
// ============================================================================
import api from './api';

const ORDER_STORAGE_KEY = 'corkboard_orders_v3';
const ALERT_ACK_KEY = 'corkboard_alert_acks_v3';

// Lifecycle valid transitions
const VALID_TRANSITIONS = {
  Placed: ['Accepted', 'Cancelled'],
  Accepted: ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready: ['Served'],
  Served: [],
  Cancelled: [],
};

// Seeded demo orders
const DEMO_ORDERS_SEED = (() => {
  const now = Date.now();
  const mins = (n) => n * 60 * 1000;

  return [
    {
      id: 'ord-001', tableNumber: 3, status: 'Served',
      primaryWaiterId: 2, primaryWaiterName: 'Bob Waiter',
      collaborators: [],
      notes: 'Guests loved the biryani',
      createdAt: new Date(now - mins(180)).toISOString(),
      updatedAt: new Date(now - mins(60)).toISOString(),
      lines: [
        { id: 'ln-001a', menuItemId: 4, menuItemName: 'Butter Chicken', quantity: 2, specialInstructions: 'Extra spicy', priceAtTime: 420, status: 'active' },
        { id: 'ln-001b', menuItemId: 6, menuItemName: 'Hyderabadi Veg Biryani', quantity: 1, specialInstructions: '', priceAtTime: 340, status: 'active' },
        { id: 'ln-001c', menuItemId: 8, menuItemName: 'Masala Chai', quantity: 2, specialInstructions: '', priceAtTime: 90, status: 'active' },
      ],
      timeline: [
        { id: 't1a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(180)).toISOString() },
        { id: 't1b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(170)).toISOString() },
        { id: 't1c', type: 'status_change', oldStatus: 'Accepted', newStatus: 'Preparing', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(155)).toISOString() },
        { id: 't1d', type: 'status_change', oldStatus: 'Preparing', newStatus: 'Ready', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(80)).toISOString() },
        { id: 't1e', type: 'status_change', oldStatus: 'Ready', newStatus: 'Served', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(60)).toISOString() },
      ],
    },
    {
      id: 'ord-002', tableNumber: 7, status: 'Preparing',
      primaryWaiterId: 2, primaryWaiterName: 'Bob Waiter',
      collaborators: [{ id: 3, name: 'Carol Waiter' }],
      notes: '',
      createdAt: new Date(now - mins(55)).toISOString(),
      updatedAt: new Date(now - mins(30)).toISOString(),
      lines: [
        { id: 'ln-002a', menuItemId: 1, menuItemName: 'Paneer Tikka', quantity: 1, specialInstructions: 'No onions', priceAtTime: 320, status: 'active' },
        { id: 'ln-002b', menuItemId: 5, menuItemName: 'Paneer Butter Masala', quantity: 2, specialInstructions: '', priceAtTime: 380, status: 'active' },
        { id: 'ln-002c', menuItemId: 7, menuItemName: 'Gulab Jamun', quantity: 2, specialInstructions: '', priceAtTime: 140, status: 'void', voidReason: 'Guest changed mind' },
      ],
      timeline: [
        { id: 't2a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(55)).toISOString() },
        { id: 't2b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(50)).toISOString() },
        { id: 't2c', type: 'line_voided', lineId: 'ln-002c', lineName: 'Gulab Jamun', reason: 'Guest changed mind', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(40)).toISOString() },
        { id: 't2d', type: 'status_change', oldStatus: 'Accepted', newStatus: 'Preparing', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(30)).toISOString() },
        { id: 't2e', type: 'collaborator_added', collaboratorName: 'Carol Waiter', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(52)).toISOString() },
      ],
    },
    {
      id: 'ord-003', tableNumber: 12, status: 'Placed',
      primaryWaiterId: 2, primaryWaiterName: 'Bob Waiter',
      collaborators: [],
      notes: 'VIP table',
      createdAt: new Date(now - mins(45)).toISOString(),
      updatedAt: new Date(now - mins(45)).toISOString(),
      lines: [
        { id: 'ln-003a', menuItemId: 3, menuItemName: 'Tandoori Chicken', quantity: 1, specialInstructions: '', priceAtTime: 360, status: 'active' },
        { id: 'ln-003b', menuItemId: 2, menuItemName: 'Samosa Chaat', quantity: 2, specialInstructions: 'Extra chutney', priceAtTime: 180, status: 'active' },
      ],
      timeline: [
        { id: 't3a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(45)).toISOString() },
        { id: 't3b', type: 'note_added', note: 'VIP table', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(45)).toISOString() },
      ],
    },
    {
      id: 'ord-004', tableNumber: 5, status: 'Accepted',
      primaryWaiterId: 3, primaryWaiterName: 'Carol Waiter',
      collaborators: [],
      notes: '',
      createdAt: new Date(now - mins(65)).toISOString(),
      updatedAt: new Date(now - mins(55)).toISOString(),
      lines: [
        { id: 'ln-004a', menuItemId: 4, menuItemName: 'Butter Chicken', quantity: 1, specialInstructions: 'Mild', priceAtTime: 420, status: 'active' },
        { id: 'ln-004b', menuItemId: 8, menuItemName: 'Masala Chai', quantity: 3, specialInstructions: '', priceAtTime: 90, status: 'active' },
      ],
      timeline: [
        { id: 't4a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(65)).toISOString() },
        { id: 't4b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(55)).toISOString() },
      ],
    },
    {
      id: 'ord-005', tableNumber: 1, status: 'Ready',
      primaryWaiterId: 2, primaryWaiterName: 'Bob Waiter',
      collaborators: [],
      notes: '',
      createdAt: new Date(now - mins(90)).toISOString(),
      updatedAt: new Date(now - mins(10)).toISOString(),
      lines: [
        { id: 'ln-005a', menuItemId: 5, menuItemName: 'Paneer Butter Masala', quantity: 1, specialInstructions: '', priceAtTime: 380, status: 'active' },
        { id: 'ln-005b', menuItemId: 7, menuItemName: 'Gulab Jamun', quantity: 2, specialInstructions: '', priceAtTime: 140, status: 'active' },
      ],
      timeline: [
        { id: 't5a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(90)).toISOString() },
        { id: 't5b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(80)).toISOString() },
        { id: 't5c', type: 'status_change', oldStatus: 'Accepted', newStatus: 'Preparing', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(70)).toISOString() },
        { id: 't5d', type: 'status_change', oldStatus: 'Preparing', newStatus: 'Ready', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(10)).toISOString() },
      ],
    },
    {
      id: 'ord-006', tableNumber: 9, status: 'Cancelled',
      primaryWaiterId: 3, primaryWaiterName: 'Carol Waiter',
      collaborators: [],
      notes: 'Guest left early',
      createdAt: new Date(now - mins(120)).toISOString(),
      updatedAt: new Date(now - mins(100)).toISOString(),
      lines: [
        { id: 'ln-006a', menuItemId: 1, menuItemName: 'Paneer Tikka', quantity: 2, specialInstructions: '', priceAtTime: 320, status: 'active' },
      ],
      timeline: [
        { id: 't6a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(120)).toISOString() },
        { id: 't6b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Cancelled', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(100)).toISOString() },
      ],
    },
    {
      id: 'ord-007', tableNumber: 2, status: 'Served',
      primaryWaiterId: 3, primaryWaiterName: 'Carol Waiter',
      collaborators: [],
      notes: '',
      createdAt: new Date(now - mins(210)).toISOString(),
      updatedAt: new Date(now - mins(90)).toISOString(),
      lines: [
        { id: 'ln-007a', menuItemId: 2, menuItemName: 'Samosa Chaat', quantity: 3, specialInstructions: '', priceAtTime: 180, status: 'active' },
        { id: 'ln-007b', menuItemId: 3, menuItemName: 'Tandoori Chicken', quantity: 2, specialInstructions: '', priceAtTime: 360, status: 'active' },
        { id: 'ln-007c', menuItemId: 8, menuItemName: 'Masala Chai', quantity: 4, specialInstructions: '', priceAtTime: 90, status: 'active' },
      ],
      timeline: [
        { id: 't7a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(210)).toISOString() },
        { id: 't7b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(200)).toISOString() },
        { id: 't7c', type: 'status_change', oldStatus: 'Accepted', newStatus: 'Preparing', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(180)).toISOString() },
        { id: 't7d', type: 'status_change', oldStatus: 'Preparing', newStatus: 'Ready', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(110)).toISOString() },
        { id: 't7e', type: 'status_change', oldStatus: 'Ready', newStatus: 'Served', actorId: 3, actorName: 'Carol Waiter', timestamp: new Date(now - mins(90)).toISOString() },
      ],
    },
    {
      id: 'ord-008', tableNumber: 4, status: 'Preparing',
      primaryWaiterId: 2, primaryWaiterName: 'Bob Waiter',
      collaborators: [],
      notes: '',
      createdAt: new Date(now - mins(40)).toISOString(),
      updatedAt: new Date(now - mins(20)).toISOString(),
      lines: [
        { id: 'ln-008a', menuItemId: 4, menuItemName: 'Butter Chicken', quantity: 3, specialInstructions: '', priceAtTime: 420, status: 'active' },
        { id: 'ln-008b', menuItemId: 1, menuItemName: 'Paneer Tikka', quantity: 2, specialInstructions: '', priceAtTime: 320, status: 'active' },
      ],
      timeline: [
        { id: 't8a', type: 'status_change', oldStatus: null, newStatus: 'Placed', actorId: 2, actorName: 'Bob Waiter', timestamp: new Date(now - mins(40)).toISOString() },
        { id: 't8b', type: 'status_change', oldStatus: 'Placed', newStatus: 'Accepted', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(35)).toISOString() },
        { id: 't8c', type: 'status_change', oldStatus: 'Accepted', newStatus: 'Preparing', actorId: 1, actorName: 'Alice Manager', timestamp: new Date(now - mins(20)).toISOString() },
      ],
    },
  ];
})();

// ---- Storage Helpers ----
const getOrders = () => {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(DEMO_ORDERS_SEED));
  return DEMO_ORDERS_SEED;
};

const saveOrders = (orders) => {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
};

const getAcknowledgedAlerts = () => {
  const raw = localStorage.getItem(ALERT_ACK_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* */ }
  }
  return {};
};

const saveAcknowledgedAlerts = (acks) => {
  localStorage.setItem(ALERT_ACK_KEY, JSON.stringify(acks));
};

// ---- Utility ----
const calcOrderTotal = (lines) => {
  return lines
    .filter(l => l.status !== 'void')
    .reduce((sum, l) => sum + (l.priceAtTime * l.quantity), 0);
};

// ---- Public API ----
export const orderService = {
  // Get all orders with filtering, search, sorting, pagination
  getOrders: async ({ page = 1, pageSize = 10, search = '', status = '', waiterId = '', date = '', sortBy = 'createdAt', sortDir = 'desc' } = {}) => {
    let orders = getOrders();

    // Filter by search (table number text)
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        String(o.tableNumber).includes(q) ||
        o.primaryWaiterName?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (status && status !== 'All') {
      orders = orders.filter(o => o.status === status);
    }

    // Filter by waiter
    if (waiterId) {
      const wid = Number(waiterId);
      orders = orders.filter(o => o.primaryWaiterId === wid || o.collaborators?.some(c => c.id === wid));
    }

    // Filter by date
    if (date) {
      const targetDate = date; // YYYY-MM-DD
      orders = orders.filter(o => o.createdAt.startsWith(targetDate));
    }

    // Sort
    orders = [...orders].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'tableNumber') {
        valA = a.tableNumber; valB = b.tableNumber;
      } else if (sortBy === 'status') {
        valA = a.status; valB = b.status;
      } else {
        valA = a.createdAt; valB = b.createdAt;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const total = orders.length;
    const start = (page - 1) * pageSize;
    const paginated = orders.slice(start, start + pageSize);

    return {
      orders: paginated.map(o => ({ ...o, total: calcOrderTotal(o.lines) })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // Get single order by ID
  getOrderById: async (id) => {
    const orders = getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    return { ...order, total: calcOrderTotal(order.lines) };
  },

  // Create new order
  createOrder: async ({ tableNumber, notes, menuLines, currentUser }) => {
    const orders = getOrders();
    const newId = `ord-${Date.now()}`;
    const now = new Date().toISOString();
    const lines = menuLines.map((ml, idx) => ({
      id: `${newId}-ln${idx}`,
      menuItemId: ml.menuItemId,
      menuItemName: ml.menuItemName,
      quantity: ml.quantity,
      specialInstructions: ml.specialInstructions || '',
      priceAtTime: ml.price,
      status: 'active',
    }));

    const order = {
      id: newId,
      tableNumber: Number(tableNumber),
      status: 'Placed',
      primaryWaiterId: currentUser.id,
      primaryWaiterName: currentUser.name,
      collaborators: [],
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
      lines,
      timeline: [
        {
          id: `${newId}-t0`,
          type: 'status_change',
          oldStatus: null,
          newStatus: 'Placed',
          actorId: currentUser.id,
          actorName: currentUser.name,
          timestamp: now,
        },
        ...(notes ? [{
          id: `${newId}-t1`,
          type: 'note_added',
          note: notes,
          actorId: currentUser.id,
          actorName: currentUser.name,
          timestamp: now,
        }] : []),
      ],
    };

    orders.unshift(order);
    saveOrders(orders);
    return { ...order, total: calcOrderTotal(order.lines) };
  },

  // Advance order status
  advanceStatus: async (orderId, newStatus, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    const validNext = VALID_TRANSITIONS[order.status] || [];

    if (!validNext.includes(newStatus)) {
      throw new Error(`Cannot move from ${order.status} to ${newStatus}. Valid moves: ${validNext.join(', ') || 'none'}`);
    }

    // Permission check: only primary waiter, collaborator, or manager
    const isManager = currentUser.role === 'manager';
    const isPrimary = order.primaryWaiterId === currentUser.id;
    const isCollaborator = order.collaborators?.some(c => c.id === currentUser.id);
    if (!isManager && !isPrimary && !isCollaborator) {
      throw new Error('You do not have permission to update this order.');
    }

    const now = new Date().toISOString();
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      type: 'status_change',
      oldStatus: order.status,
      newStatus,
      actorId: currentUser.id,
      actorName: currentUser.name,
      timestamp: now,
    };

    orders[idx] = {
      ...order,
      status: newStatus,
      updatedAt: now,
      timeline: [...order.timeline, timelineEntry],
    };

    saveOrders(orders);
    return { ...orders[idx], total: calcOrderTotal(orders[idx].lines) };
  },

  // Archive/restore order
  archiveOrder: async (orderId, archived, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');
    orders[idx] = { ...orders[idx], archived, updatedAt: new Date().toISOString() };
    saveOrders(orders);
    return orders[idx];
  },

  // Add a line to an order
  addLine: async (orderId, lineData, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    const openStatuses = ['Placed', 'Accepted', 'Preparing', 'Ready'];
    if (!openStatuses.includes(order.status)) {
      throw new Error(`Cannot add lines to an order in status: ${order.status}`);
    }

    const now = new Date().toISOString();
    const newLine = {
      id: `${orderId}-ln${Date.now()}`,
      menuItemId: lineData.menuItemId,
      menuItemName: lineData.menuItemName,
      quantity: lineData.quantity,
      specialInstructions: lineData.specialInstructions || '',
      priceAtTime: lineData.price,
      status: 'active',
    };

    const timelineEntry = {
      id: `tl-${Date.now()}`,
      type: 'line_added',
      lineId: newLine.id,
      lineName: newLine.menuItemName,
      quantity: newLine.quantity,
      actorId: currentUser.id,
      actorName: currentUser.name,
      timestamp: now,
    };

    orders[idx] = {
      ...order,
      lines: [...order.lines, newLine],
      updatedAt: now,
      timeline: [...order.timeline, timelineEntry],
    };

    saveOrders(orders);
    return { ...orders[idx], total: calcOrderTotal(orders[idx].lines) };
  },

  // Void a line
  voidLine: async (orderId, lineId, reason, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    if (['Served', 'Cancelled'].includes(order.status)) {
      throw new Error('Cannot void a line on a closed order.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A reason is required to void a line.');
    }

    const now = new Date().toISOString();
    const lineIdx = order.lines.findIndex(l => l.id === lineId);
    if (lineIdx === -1) throw new Error('Line not found');

    const updatedLines = [...order.lines];
    updatedLines[lineIdx] = { ...updatedLines[lineIdx], status: 'void', voidReason: reason };

    const timelineEntry = {
      id: `tl-${Date.now()}`,
      type: 'line_voided',
      lineId,
      lineName: updatedLines[lineIdx].menuItemName,
      reason,
      actorId: currentUser.id,
      actorName: currentUser.name,
      timestamp: now,
    };

    orders[idx] = {
      ...order,
      lines: updatedLines,
      updatedAt: now,
      timeline: [...order.timeline, timelineEntry],
    };

    saveOrders(orders);
    return { ...orders[idx], total: calcOrderTotal(orders[idx].lines) };
  },

  // Add collaborator
  addCollaborator: async (orderId, collaborator, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    if (order.collaborators?.some(c => c.id === collaborator.id)) {
      throw new Error('This waiter is already a collaborator.');
    }

    const now = new Date().toISOString();
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      type: 'collaborator_added',
      collaboratorName: collaborator.name,
      actorId: currentUser.id,
      actorName: currentUser.name,
      timestamp: now,
    };

    orders[idx] = {
      ...order,
      collaborators: [...(order.collaborators || []), collaborator],
      updatedAt: now,
      timeline: [...order.timeline, timelineEntry],
    };

    saveOrders(orders);
    return orders[idx];
  },

  // Remove collaborator
  removeCollaborator: async (orderId, collaboratorId, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    orders[idx] = {
      ...order,
      collaborators: order.collaborators.filter(c => c.id !== collaboratorId),
      updatedAt: new Date().toISOString(),
    };

    saveOrders(orders);
    return orders[idx];
  },

  // Add note to order
  addNote: async (orderId, note, currentUser) => {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    const now = new Date().toISOString();
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      type: 'note_added',
      note,
      actorId: currentUser.id,
      actorName: currentUser.name,
      timestamp: now,
    };

    orders[idx] = {
      ...order,
      notes: note,
      updatedAt: now,
      timeline: [...order.timeline, timelineEntry],
    };

    saveOrders(orders);
    return orders[idx];
  },

  // Get slow orders (open for > threshold minutes without reaching Ready)
  getSlowOrders: (thresholdMinutes = 30) => {
    const orders = getOrders();
    const acks = getAcknowledgedAlerts();
    const now = Date.now();
    const openStatuses = ['Placed', 'Accepted', 'Preparing'];

    return orders.filter(order => {
      if (!openStatuses.includes(order.status)) return false;
      const ageMs = now - new Date(order.createdAt).getTime();
      const ageMin = ageMs / 60000;
      if (ageMin < thresholdMinutes) return false;

      const ack = acks[order.id];
      if (!ack) return true;

      // Re-alert if still not ready after another N minutes
      const reAlertMinutes = 15;
      const timeSinceAck = (now - ack.timestamp) / 60000;
      return timeSinceAck >= reAlertMinutes;
    });
  },

  // Acknowledge slow order alert
  acknowledgeAlert: (orderId) => {
    const acks = getAcknowledgedAlerts();
    acks[orderId] = { timestamp: Date.now() };
    saveAcknowledgedAlerts(acks);
  },

  // Export orders as CSV
  exportOrdersCSV: () => {
    const today = new Date().toISOString().slice(0, 10);
    const orders = getOrders().filter(o => o.createdAt.startsWith(today));

    const headers = ['Order ID', 'Table', 'Status', 'Waiter', 'Lines', 'Total (INR)', 'Placed At'];
    const rows = orders.map(o => {
      const linesSummary = o.lines.filter(l => l.status !== 'void').map(l => `${l.menuItemName} x${l.quantity}`).join('; ');
      return [
        o.id,
        o.tableNumber,
        o.status,
        o.primaryWaiterName,
        linesSummary,
        calcOrderTotal(o.lines).toFixed(2),
        new Date(o.createdAt).toLocaleString('en-IN'),
      ];
    });

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corkboard-orders-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Get valid next statuses for an order
  getValidTransitions: (status) => VALID_TRANSITIONS[status] || [],
};
