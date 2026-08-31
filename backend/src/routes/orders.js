// ============================================================================
// Orders API Router
// ============================================================================
// Exposes REST endpoints for the full order lifecycle (Goals 2–5, 9).
//
// Route summary:
//   POST   /                              Create a new order
//   GET    /:id                           Fetch a single order (full detail)
//   PATCH  /:id/status                    Advance / cancel order status
//   PATCH  /:id/archive                   Archive or restore an order
//   POST   /:id/lines                     Add a line item
//   PATCH  /:id/lines/:lineId/void        Void a line item
//   POST   /:id/collaborators             Add a collaborator
//   DELETE /:id/collaborators/:userId      Remove a collaborator
//   POST   /:id/notes                     Add a note
// ============================================================================

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const orderModel = require('../models/orderModel');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: parse an integer route param and return 400 on failure
// ---------------------------------------------------------------------------
const parseIntParam = (value, label) => {
  const n = parseInt(value, 10);
  if (isNaN(n)) {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
  return n;
};

// ---------------------------------------------------------------------------
// POST /api/orders — Create order
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    authenticate,
    body('tableNumber').notEmpty().withMessage('Table number is required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
    body('lines.*.menuItemId').isInt({ min: 1 }).withMessage('Each line must have a valid menuItemId'),
    body('lines.*.quantity').isInt({ min: 1 }).withMessage('Each line must have a quantity ≥ 1'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { tableNumber, notes, lines } = req.body;

      const order = await orderModel.createOrder({
        tableNumber,
        notes: notes || '',
        lines: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          specialInstructions: l.specialInstructions || '',
        })),
        primaryWaiterId: req.user.id,
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/orders/:id — Fetch single order with full detail
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const orderId = parseIntParam(req.params.id, 'order ID');
    const order = await orderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Waiters may only view orders where they are primary or collaborator
    if (req.user.role !== 'manager') {
      const isPrimary = order.primaryWaiterId === req.user.id;
      const isCollab = order.collaborators.some((c) => c.id === req.user.id);
      if (!isPrimary && !isCollab) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this order.',
        });
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/status — Advance or cancel order status
// ---------------------------------------------------------------------------
router.patch(
  '/:id/status',
  [
    authenticate,
    body('status').notEmpty().withMessage('New status is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');
      const order = await orderModel.advanceStatus(
        orderId,
        req.body.status,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/archive — Archive or restore
// ---------------------------------------------------------------------------
router.patch(
  '/:id/archive',
  [
    authenticate,
    authorize('manager'),
    body('archived').isBoolean().withMessage('archived must be a boolean'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');
      const order = await orderModel.archiveOrder(
        orderId,
        req.body.archived,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/orders/:id/lines — Add a line item to an open order
// ---------------------------------------------------------------------------
router.post(
  '/:id/lines',
  [
    authenticate,
    body('menuItemId').isInt({ min: 1 }).withMessage('A valid menuItemId is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');
      const { menuItemId, quantity, specialInstructions } = req.body;

      const order = await orderModel.addLine(
        orderId,
        { menuItemId, quantity, specialInstructions: specialInstructions || '' },
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/lines/:lineId/void — Void a line item
// ---------------------------------------------------------------------------
router.patch(
  '/:id/lines/:lineId/void',
  [
    authenticate,
    body('reason').notEmpty().withMessage('A reason is required to void a line'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');
      const lineId = parseIntParam(req.params.lineId, 'line ID');

      const order = await orderModel.voidLine(
        orderId,
        lineId,
        req.body.reason,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/orders/:id/collaborators — Add a collaborator
// ---------------------------------------------------------------------------
router.post(
  '/:id/collaborators',
  [
    authenticate,
    body('userId').isInt({ min: 1 }).withMessage('A valid userId is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');

      const order = await orderModel.addCollaborator(
        orderId,
        req.body.userId,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/orders/:id/collaborators/:userId — Remove a collaborator
// ---------------------------------------------------------------------------
router.delete(
  '/:id/collaborators/:userId',
  authenticate,
  async (req, res, next) => {
    try {
      const orderId = parseIntParam(req.params.id, 'order ID');
      const collaboratorId = parseIntParam(req.params.userId, 'user ID');

      const order = await orderModel.removeCollaborator(
        orderId,
        collaboratorId,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/orders/:id/notes — Add a note
// ---------------------------------------------------------------------------
router.post(
  '/:id/notes',
  [
    authenticate,
    body('content').notEmpty().withMessage('Note content is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const orderId = parseIntParam(req.params.id, 'order ID');

      const order = await orderModel.addNote(
        orderId,
        req.body.content,
        req.user.id,
        req.user.role,
      );

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
