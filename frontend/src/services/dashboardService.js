// ============================================================================
// Dashboard Service — Server-side analytics via API (Goal 8)
// ============================================================================
import api from './api';

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data.data;
  },
};
