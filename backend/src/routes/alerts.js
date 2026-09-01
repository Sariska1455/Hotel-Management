// ============================================================================
// Alerts API Router (Goal 10)
// ============================================================================
const express = require('express');
const orderModel = require('../models/orderModel');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts
// Returns slow orders that have been open > threshold minutes without
// reaching Ready, respecting acknowledgement cooldowns.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const threshold = parseInt(process.env.ALERT_THRESHOLD_MINUTES || '30', 10);
    const recheck = parseInt(process.env.ALERT_RECHECK_MINUTES || '15', 10);
    const alerts = await orderModel.getSlowOrders(threshold, recheck);
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:orderId/acknowledge
// Acknowledge a slow order alert — clears it for recheck_minutes.
router.post('/:orderId/acknowledge', authenticate, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }
    await orderModel.acknowledgeAlert(orderId, req.user.id);
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
