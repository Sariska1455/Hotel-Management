// ============================================================================
// Menu Items API Router
// ============================================================================
const express = require('express');
const { body, validationResult } = require('express-validator');
const menuModel = require('../models/menuModel');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/menu-items
// Accessible by both waiters and managers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, search, includeArchived } = req.query;
    
    // Only managers can request archived items
    const canSeeArchived = req.user.role === 'manager' && includeArchived === 'true';

    const items = await menuModel.getMenuItems({
      includeArchived: canSeeArchived,
      category,
      search
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/menu-items/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await menuModel.getMenuItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/menu-items
// Manager only: create menu item
router.post(
  '/',
  [
    authenticate,
    authorize('manager'),
    body('name').notEmpty().withMessage('Menu item name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('category').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { name, description, category, price, is_available } = req.body;

      const newItem = await menuModel.createMenuItem({
        name,
        description,
        category: category || 'Mains',
        price: parseFloat(price),
        is_available: is_available !== undefined ? is_available : true
      });

      res.status(201).json({
        success: true,
        data: newItem
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/menu-items/:id
// Manager only: update menu item
router.put(
  '/:id',
  [
    authenticate,
    authorize('manager'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { name, description, category, price, is_available, is_archived } = req.body;

      const updated = await menuModel.updateMenuItem(req.params.id, {
        name,
        description,
        category,
        price: price !== undefined ? parseFloat(price) : undefined,
        is_available,
        is_archived
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
      }

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/menu-items/bulk
// Manager only: Bulk update menu items (Goal 7 requirement)
// Reports per-item success and failure status
router.patch(
  '/bulk',
  [
    authenticate,
    authorize('manager'),
    body('itemIds').isArray({ min: 1 }).withMessage('itemIds must be a non-empty array')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { itemIds, price, is_available } = req.body;

      const batchResult = await menuModel.bulkUpdateMenuItems({
        itemIds,
        price,
        is_available
      });

      const totalSuccess = batchResult.filter((r) => r.status === 'success').length;
      const totalRejected = batchResult.filter((r) => r.status === 'rejected').length;

      res.json({
        success: true,
        summary: {
          totalProcessed: itemIds.length,
          totalSuccess,
          totalRejected
        },
        data: batchResult
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
