// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.details || err.message,
        status: 400
      }
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: {
        message: 'Unauthorized',
        status: 401
      }
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
};

module.exports = errorHandler;
