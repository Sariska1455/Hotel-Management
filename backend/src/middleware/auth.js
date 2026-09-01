const jwt = require('jsonwebtoken');

// Middleware to authenticate the user by verifying their JWT token.
// Authentication answers "Who are you?".
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks if the token is valid and hasn't been tampered with.
    // It uses our secret key. If valid, it decodes the payload we embedded earlier.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // We attach the decoded payload (like { id, email, role }) to req.user.
    // This allows subsequent middleware and route handlers to know exactly who made the request.
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

// Middleware to authorize the user based on their role.
// Authorization answers "Are you allowed to do this?".
// We separate it from authentication because while many routes require a valid user (authentication),
// specific actions (like creating users) may be restricted to certain roles (authorization).
const authorize = (...roles) => {
  return (req, res, next) => {
    // Admin (Owner) automatically inherits permissions for any manager-level routes
    const effectiveRoles = roles.includes('manager') ? [...roles, 'admin'] : roles;
    if (!req.user || !effectiveRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden. You do not have the required permissions.' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
