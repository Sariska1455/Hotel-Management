// Centralized error handler middleware.
// Catch-all error handler ensures all unhandled errors go through a single point.
// It formats the error response consistently as { success: false, error: message }.
// This makes it easier for the frontend to predict and handle error structures.
const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging purposes
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;
