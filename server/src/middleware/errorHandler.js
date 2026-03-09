/**
 * Global Error Handler Middleware
 * 
 * Catches all errors thrown in route handlers and middleware.
 * Returns consistent JSON error responses.
 * 
 * In development: includes full error stack trace
 * In production: hides internal errors, shows generic message
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code set
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    // Log the error
    if (statusCode >= 500) {
        logger.error(`${statusCode} - ${err.message}`, {
            url: req.originalUrl,
            method: req.method,
            stack: err.stack,
        });
    } else {
        logger.warn(`${statusCode} - ${err.message}`, {
            url: req.originalUrl,
            method: req.method,
        });
    }

    // Build response
    const response = {
        success: false,
        error: {
            message: isOperational ? err.message : 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err.message,
            }),
        },
    };

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
