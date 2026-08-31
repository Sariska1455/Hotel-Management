require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
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
app.use('/api/menu-items', menuRoutes);

// Handle 404 Not Found for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// We register our centralized error handler last.
// Any error passed to next(error) will be caught here.
app.use(errorHandler);

// We separate the Express app setup from the server start code (server.js).
// This is critical for testability — it allows us to import the app in our test files
// and mock HTTP requests using tools like Supertest without actually starting a server on a port.
module.exports = app;
