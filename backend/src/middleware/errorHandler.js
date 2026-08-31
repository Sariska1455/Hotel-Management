// Centralized error handler middleware.
// Catch-all error handler ensures all unhandled errors go through a single point.
// It formats the error response consistently as { success: false, error: message }.
// This makes it easier for the frontend to predict and handle error structures.
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  const isDbConnectionError = 
    err.code === 'ENOTFOUND' || 
    err.code === 'ECONNREFUSED' || 
    err.code === 'ETIMEDOUT' ||
    (err.message && (
      err.message.includes('ENOTFOUND') || 
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('password authentication failed')
    ));

  // Catch unconfigured or unreachable database host errors gracefully
  if (isDbConnectionError) {
    statusCode = 503;
    if (err.code === 'ETIMEDOUT' || (err.message && err.message.includes('ETIMEDOUT'))) {
      message = 'Database Connection Timeout: Direct connection to Supabase timed out over IPv6. Please update DATABASE_URL in backend/.env to use the Supabase Connection Pooler URL (pooler.supabase.com:6543).';
    } else if (err.message && err.message.includes('password authentication failed')) {
      message = 'Database Auth Failed: Password authentication failed for PostgreSQL user. Please verify or reset your database password in Supabase Dashboard and update backend/.env.';
    } else {
      message = 'Database connection error: DATABASE_URL in backend/.env is not configured with a valid PostgreSQL host.';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code
  });
};

module.exports = errorHandler;
