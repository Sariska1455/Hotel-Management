// ============================================================================
// Dashboard Service — Real-time analytics from demo order data
// ============================================================================
import { orderService } from './orderService';

const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

export const dashboardService = {
  getStats: async () => {
    const { orders: allOrders } = await orderService.getOrders({ page: 1, pageSize: 1000 });
    const today = new Date().toISOString().slice(0, 10);

    const openStatuses = ['Placed', 'Accepted', 'Preparing', 'Ready'];
    const openOrders = allOrders.filter(o => openStatuses.includes(o.status));
    const todaysOrders = allOrders.filter(o => o.createdAt.startsWith(today));
    const servedToday = todaysOrders.filter(o => o.status === 'Served');
    const revenueToday = servedToday.reduce((sum, o) => sum + (o.total || 0), 0);

    // Orders by status
    const statusCounts = {};
    allOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Orders by waiter
    const waiterCounts = {};
    allOrders.forEach(o => {
      const key = o.primaryWaiterName || 'Unknown';
      if (!waiterCounts[key]) waiterCounts[key] = { name: key, orders: 0, revenue: 0 };
      waiterCounts[key].orders += 1;
      if (o.status === 'Served') waiterCounts[key].revenue += (o.total || 0);
    });

    // 14-day served orders chart
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const served = allOrders.filter(o => o.status === 'Served' && o.createdAt.startsWith(dateStr)).length;
      const revenue = allOrders
        .filter(o => o.status === 'Served' && o.createdAt.startsWith(dateStr))
        .reduce((sum, o) => sum + (o.total || 0), 0);
      last14Days.push({ date: dateStr, label, served, revenue });
    }

    return {
      openOrders: openOrders.length,
      ordersToday: todaysOrders.length,
      servedToday: servedToday.length,
      revenueToday,
      revenueTodayFormatted: formatINR(revenueToday),
      statusCounts,
      waiterBreakdown: Object.values(waiterCounts),
      chartData: last14Days,
    };
  },
};
