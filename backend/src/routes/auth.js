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

// POST /register
// Register a new user
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['manager', 'waiter']).withMessage('Role must be either manager or waiter')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, password, name, role } = req.body;

      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }

      // bcrypt hashes the password. 10 rounds is the "salt rounds", meaning the
      // algorithm runs 2^10 times. This slows down brute-force attacks significantly.
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await userModel.createUser(email, passwordHash, name, role);

      const token = generateToken(user);

      // We never return the password hash to the client for security reasons.
      // We explicitly exclude it from the response.
      const { password_hash, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      });
    } catch (error) {
      next(error); // Pass to the centralized error handler
    }
  }
);

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

module.exports = router;
