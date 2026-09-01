const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS (Cross-Origin Resource Sharing) allows our frontend (running on a different port/domain)
// to securely communicate with this backend API. Without it, browsers block cross-origin requests.
app.use(cors());

// express.json() is built-in middleware that parses incoming requests with JSON payloads.
// It populates req.body with the parsed data, making it easy to access.
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Mount our routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);

// In production, serve the built Vite frontend if dist folder exists
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Express 5 requires named wildcards; this form also matches the root path.
  app.get('/{*splat}', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Handle 404 Not Found for undefined API routes
app.use('/api', (req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// We register our centralized error handler last.
// Any error passed to next(error) will be caught here.
app.use(errorHandler);

// We separate the Express app setup from the server start code (server.js).
// This is critical for testability — it allows us to import the app in our test files
// and mock HTTP requests using tools like Supertest without actually starting a server on a port.
module.exports = app;
