// ============================================================================
// Order Service — Real API integration for full order lifecycle
// ============================================================================
import api from './api';

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val));

// Lifecycle valid transitions (used for UI button rendering)
const VALID_TRANSITIONS = {
  Placed: ['Accepted', 'Cancelled'],
  Accepted: ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready: ['Served'],
  Served: [],
  Cancelled: [],
};

export const orderService = {
  /**
   * Get paginated, filtered, sorted orders from the server (Goal 6).
   */
  getOrders: async ({
    page = 1,
    pageSize = 10,
    search = '',
    status = '',
    waiterId = '',
    date = '',
    sortBy = 'createdAt',
    sortDir = 'desc',
  } = {}) => {
    const response = await api.get('/orders', {
      params: { page, pageSize, search, status, waiterId, date, sortBy, sortDir },
    });
    return {
      orders: response.data.orders,
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
      totalPages: response.data.totalPages,
    };
  },

  /**
   * Get single order by ID with full detail.
   */
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  /**
   * Create a new order with line items.
   */
  createOrder: async ({ tableNumber, notes, menuLines }) => {
    const response = await api.post('/orders', {
      tableNumber,
      notes: notes || '',
      lines: menuLines.map(l => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        specialInstructions: l.specialInstructions || '',
      })),
    });
    return response.data.data;
  },

  /**
   * Advance order status (Goal 4 lifecycle).
   */
  advanceStatus: async (orderId, newStatus) => {
    const response = await api.patch(`/orders/${orderId}/status`, {
      status: newStatus,
    });
    return response.data.data;
  },

  /**
   * Archive or restore an order (Goal 2).
   */
  archiveOrder: async (orderId, archived) => {
    const response = await api.patch(`/orders/${orderId}/archive`, { archived });
    return response.data.data;
  },

  /**
   * Add a line item to an open order (Goal 3).
   */
  addLine: async (orderId, { menuItemId, quantity, specialInstructions }) => {
    const response = await api.post(`/orders/${orderId}/lines`, {
      menuItemId,
      quantity,
      specialInstructions: specialInstructions || '',
    });
    return response.data.data;
  },

  /**
   * Void a line item with required reason (Goal 4).
   */
  voidLine: async (orderId, lineId, reason) => {
    const response = await api.patch(`/orders/${orderId}/lines/${lineId}/void`, {
      reason,
    });
    return response.data.data;
  },

  /**
   * Add a collaborator to an order (Goal 5).
   */
  addCollaborator: async (orderId, userId) => {
    const response = await api.post(`/orders/${orderId}/collaborators`, {
      userId,
    });
    return response.data.data;
  },

  /**
   * Remove a collaborator from an order.
   */
  removeCollaborator: async (orderId, collaboratorId) => {
    const response = await api.delete(`/orders/${orderId}/collaborators/${collaboratorId}`);
    return response.data.data;
  },

  /**
   * Add a note to an order (Goal 9 timeline).
   */
  addNote: async (orderId, content) => {
    const response = await api.post(`/orders/${orderId}/notes`, { content });
    return response.data.data;
  },

  /**
   * Get slow order alerts from server (Goal 10).
   */
  getSlowOrders: async () => {
    const response = await api.get('/alerts');
    return response.data.data;
  },

  /**
   * Acknowledge a slow order alert (Goal 10).
   */
  acknowledgeAlert: async (orderId) => {
    await api.post(`/alerts/${orderId}/acknowledge`);
  },

  /**
   * Export today's orders as CSV download (Goal 7).
   */
  exportOrdersCSV: async () => {
    const response = await api.get('/orders/export/csv', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get valid next statuses for an order.
   */
  getValidTransitions: (status) => VALID_TRANSITIONS[status] || [],
};
