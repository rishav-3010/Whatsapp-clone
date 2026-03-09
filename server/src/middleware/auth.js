/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens for:
 * 1. REST API routes (via Authorization header)
 * 2. Socket.io connections (via handshake auth token)
 * 
 * Attaches decoded user payload to req.user or socket.user
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Middleware for Express routes
 * Extracts JWT from Authorization: Bearer <token> header
 */
const authenticateHTTP = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required. Please provide a valid token.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request object
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired. Please login again.', 401));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token. Please login again.', 401));
        }
        next(error);
    }
};

/**
 * Middleware for Socket.io handshake
 * Extracts JWT from socket.handshake.auth.token
 * 
 * This runs ONCE during the WebSocket upgrade handshake.
 * If the token is invalid, the connection is rejected before
 * any events can be processed.
 */
const authenticateSocket = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to socket object (available for entire connection lifetime)
        socket.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
        };

        logger.debug(`Socket authenticated for user: ${decoded.username}`);
        next();
    } catch (error) {
        logger.warn(`Socket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
    }
};

module.exports = { authenticateHTTP, authenticateSocket };
