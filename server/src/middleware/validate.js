/**
 * Request Validation Middleware
 * 
 * Simple validation helpers for request body fields.
 * In production, consider using Joi or Zod for more robust schemas.
 */

const { AppError } = require('../utils/helpers');

/**
 * Validate required fields exist in request body
 * @param {string[]} fields - Required field names
 * @returns {Function} Express middleware
 */
const validateRequired = (fields) => (req, res, next) => {
    const missing = fields.filter((field) => {
        const value = req.body[field];
        return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
        return next(
            new AppError(`Missing required fields: ${missing.join(', ')}`, 400)
        );
    }
    next();
};

/**
 * Validate email format
 */
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(new AppError('Invalid email format', 400));
        }
    }
    next();
};

/**
 * Validate password strength
 */
const validatePassword = (req, res, next) => {
    const { password } = req.body;
    if (password && password.length < 6) {
        return next(new AppError('Password must be at least 6 characters', 400));
    }
    next();
};

module.exports = { validateRequired, validateEmail, validatePassword };
