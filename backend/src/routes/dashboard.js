// ============================================================================
// Dashboard API Router (Goal 8)
// ============================================================================
const express = require('express');
const orderModel = require('../models/orderModel');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
// Returns all dashboard headline numbers, status breakdown, waiter breakdown,
// and 14-day chart data — all computed server-side.
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await orderModel.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
