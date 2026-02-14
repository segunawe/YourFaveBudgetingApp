const { auth } = require('../config/firebase');

/**
 * Middleware to verify Firebase authentication token
 * Expects Authorization header with Bearer token
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Unauthorized - No token provided',
          status: 401
        }
      });
    }

    // Extract token
    const token = authHeader.split('Bearer ')[1];

    // Verify token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          status: 401
        }
      });
    }

    return res.status(401).json({
      error: {
        message: 'Unauthorized - Invalid token',
        status: 401
      }
    });
  }
};

module.exports = authenticateUser;
