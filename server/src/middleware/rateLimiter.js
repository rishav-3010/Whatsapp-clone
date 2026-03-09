/**
 * Rate Limiter Middleware
 * 
 * Prevents abuse by limiting request frequency per IP.
 * Uses Redis store for distributed rate limiting across server instances.
 * 
 * Two limiters provided:
 * 1. apiLimiter - General API rate limiting
 * 2. authLimiter - Stricter limit for auth endpoints (prevent brute force)
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,   // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,    // Disable X-RateLimit-* headers
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
    message: {
        success: false,
        error: {
            message: 'Too many requests. Please try again later.',
            retryAfter: 'Check Retry-After header',
        },
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    },
});

/**
 * Auth-specific rate limiter (stricter)
 * 10 requests per 15 minutes per IP for login/register
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
    message: {
        success: false,
        error: {
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
        },
    },
    handler: (req, res, next, options) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    },
});

module.exports = { apiLimiter, authLimiter };
