// ============================================================================
// User & Staff Management API Service (Admin Only)
// ============================================================================
import api from './api';

export const userService = {
  // Get all users/staff members
  getStaff: async () => {
    const response = await api.get('/users');
    return response.data.data;
  },

  // Admin creates a new staff credential (Manager or Waiter)
  createStaff: async ({ name, email, password, role }) => {
    const response = await api.post('/users', { name, email, password, role });
    return response.data;
  },

  // Admin deletes a staff member
  deleteStaff: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default userService;
