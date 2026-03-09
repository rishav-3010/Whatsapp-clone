/**
 * Utility Helpers
 * 
 * Common utility functions used across the application.
 */

/**
 * Custom application error with status code
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Wrap async route handlers to automatically catch errors
 * Eliminates the need for try-catch in every controller
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generate a cursor-based pagination response
 * @param {Array} items - Query results
 * @param {number} limit - Page size
 * @returns {Object} Paginated response with nextCursor
 */
const paginateResponse = (items, limit) => {
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1].created_at : null;

    return {
        data,
        pagination: {
            hasMore,
            nextCursor,
            count: data.length,
        },
    };
};

/**
 * Sanitize user object — strip sensitive fields before sending to client
 * @param {Object} user - Raw user object from DB
 * @returns {Object} Safe user object
 */
const sanitizeUser = (user) => {
    const { password_hash, ...safeUser } = user;
    return safeUser;
};

module.exports = {
    AppError,
    asyncHandler,
    paginateResponse,
    sanitizeUser,
};
