/**
 * Socket.io Server Configuration
 * 
 * Sets up Socket.io with:
 * - CORS configuration for client origin
 * - Redis adapter for horizontal scaling (multi-instance broadcasting)
 * - Connection state recovery for handling reconnections
 * - Ping/pong heartbeat for connection health monitoring
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisPubClient, redisSubClient } = require('./redis');
const logger = require('../utils/logger');

/**
 * Initialize Socket.io server with Redis adapter
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Configured Socket.io server
 */
const createSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Connection health monitoring
        pingTimeout: 60000,      // Wait 60s for pong before considering disconnected
        pingInterval: 25000,     // Send ping every 25s
        // Transport configuration
        transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
        // Connection state recovery (Socket.io v4.6+)
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true,
        },
    });

    // Attach Redis adapter for multi-instance broadcasting
    // This ensures events emitted on one server are delivered to
    // clients connected to ANY server in the cluster
    io.adapter(createAdapter(redisPubClient, redisSubClient));

    logger.info('✅ Socket.io server initialized with Redis adapter');

    return io;
};

module.exports = { createSocketServer };
