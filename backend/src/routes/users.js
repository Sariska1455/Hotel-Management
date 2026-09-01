// ============================================================================
// Users Management API Router (Admin / Owner Only)
// ============================================================================
// Allows the Admin (Owner) to:
// - List all staff members
// - Create new Manager and Waiter credentials (saved in DB)
// - Delete staff members
// ============================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin-only authorization to all routes in this file
router.use(authenticate);
router.use(authorize('admin'));

// ---------------------------------------------------------------------------
// GET /api/users — List all users for Admin
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const users = await userModel.getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/users — Admin creates a new staff credential (Manager or Waiter)
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['manager', 'waiter']).withMessage('Role must be either manager or waiter'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, password, name, role } = req.body;

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'A user with this email already exists' });
      }

      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user in PostgreSQL database
      const newUser = await userModel.createUser(email, passwordHash, name, role);

      const { password_hash, ...safeUser } = newUser;

      res.status(201).json({
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
        data: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/users/:id — Admin deletes a staff member
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    // Prevent Admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own admin account' });
    }

    const targetUser = await userModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has associated orders or history
    const hasOrders = await userModel.checkUserOrders(userId);
    if (hasOrders) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete this staff member because they have created orders or logged timeline actions in the restaurant audit history.',
      });
    }

    const deleted = await userModel.deleteUser(userId);

    res.json({
      success: true,
      message: `Account for ${deleted.name} (${deleted.role}) has been deleted`,
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
