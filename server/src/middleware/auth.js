const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT and attach authenticated user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid format',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'super_secure_jwt_secret_key_change_in_production_9876543210';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          isExpired: true,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or has been removed',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or suspended. Please contact support.',
        accountStatus: user.status,
      });
    }

    // Attach verified user
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Middleware to enforce Role-Based Access Control (RBAC)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated request',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

/**
 * Middleware to ensure user account is active
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user || req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Account is inactive or suspended',
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireActiveUser,
};
