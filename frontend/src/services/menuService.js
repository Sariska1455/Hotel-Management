// ============================================================================
// Menu Service — Real API integration for menu items
// ============================================================================
import api from './api';

export const menuService = {
  /**
   * Fetch all menu items with optional filters.
   */
  getMenuItems: async ({ category = 'All', search = '', includeArchived = false } = {}) => {
    const response = await api.get('/menu-items', {
      params: { category, search, includeArchived },
    });
    return response.data.data;
  },

  /**
   * Create a new menu item (Manager only).
   */
  createMenuItem: async (itemData) => {
    const response = await api.post('/menu-items', itemData);
    return response.data.data;
  },

  /**
   * Update an existing menu item (Manager only).
   */
  updateMenuItem: async (id, updateData) => {
    const response = await api.put(`/menu-items/${id}`, updateData);
    return response.data.data;
  },

  /**
   * Bulk update menu items (Goal 7).
   * Reports per-item success/failure.
   */
  bulkUpdateMenuItems: async ({ itemIds, price, is_available }) => {
    const response = await api.patch('/menu-items/bulk', {
      itemIds,
      price,
      is_available,
    });
    return response.data;
  },
};
