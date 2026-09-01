const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/userModel');

const router = express.Router();

// Helper function to generate JWT
// The JWT payload should only contain minimal, non-sensitive information required
// to identify the user and their permissions. We never put passwords in it.
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Public registration is disabled.
// Only the Admin (Owner) can create login credentials for Waiters and Managers via /api/users.
router.post('/register', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Public account registration is disabled. Please contact your restaurant Administrator/Owner for login credentials.'
  });
});

// POST /login
// Authenticate a user and issue a JWT
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      // bcrypt.compare safely verifies if the plaintext password matches the hashed one
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = generateToken(user);

      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /me
// Returns current authenticated user profile
router.get('/me', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: { user: userWithoutPassword }
    });
  } catch (error) {
    next(error);
  }
});

// GET /waiters
// Returns all users with role 'waiter' (for collaborator dropdowns, filters etc.)
router.get('/waiters', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    const waiters = await userModel.getAllWaiters();
    // Strip password hashes before sending
    const safe = waiters.map(({ password_hash, ...w }) => w);
    res.json({ success: true, data: safe });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
