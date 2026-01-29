/**
 * Error Handler Middleware
 * 
 * Centralized error handling for consistent API responses.
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
    }
}

/**
 * Not Found handler
 */
function notFoundHandler(req, res, next) {
    const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
    next(error);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.originalUrl,
        method: req.method,
    });

    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid data provided',
            details: err.errors.map(e => ({
                field: e.path,
                message: e.message,
            })),
        });
    }

    // Handle Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Conflict',
            message: 'Resource already exists',
        });
    }

    // Handle custom API errors
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details,
        });
    }

    // Handle unknown errors
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'An unexpected error occurred',
    });
}

/**
 * Async handler wrapper to catch promise rejections
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    ApiError,
    notFoundHandler,
    errorHandler,
    asyncHandler,
};
