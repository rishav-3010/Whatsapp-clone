/**
 * Socket.io Main Initialization
 * 
 * This is the central hub for all WebSocket connections.
 * 
 * Lifecycle:
 * 1. Client connects via WebSocket with JWT in handshake
 * 2. authenticateSocket middleware validates the JWT
 * 3. On success, 'connection' event fires
 * 4. We register all event handlers (chat, typing, presence, receipts)
 * 5. We handle user coming online (join rooms, broadcast presence)
 * 6. On 'disconnect', we handle user going offline
 * 
 * MEMORY LEAK PREVENTION:
 * - All event listeners are bound to the socket instance
 * - When socket disconnects, Socket.io automatically cleans up
 *   all listeners registered via socket.on()
 * - We avoid storing socket references in global arrays/maps
 * - The Redis adapter handles cross-server cleanup
 */

const { authenticateSocket } = require('../middleware/auth');
const registerChatHandlers = require('./chatHandler');
const registerTypingHandlers = require('./typingHandler');
const registerReadReceiptHandlers = require('./readReceiptHandler');
const { handleUserOnline, handleUserOffline } = require('./presenceHandler');
const logger = require('../utils/logger');

/**
 * Initialize all Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocketHandlers = (io) => {
    // ============================================
    // Authentication Middleware
    // Runs ONCE during the WebSocket handshake
    // Rejects unauthenticated connections before
    // any events can be processed
    // ============================================
    io.use(authenticateSocket);

    // ============================================
    // Connection Handler
    // Fires after successful authentication
    // ============================================
    io.on('connection', async (socket) => {
        logger.info(`🔗 Socket connected: ${socket.user.username} (${socket.id})`);

        // ----------------------------------------
        // Register event handlers
        // Each handler module binds its own events
        // ----------------------------------------
        registerChatHandlers(io, socket);
        registerTypingHandlers(io, socket);
        registerReadReceiptHandlers(io, socket);

        // ----------------------------------------
        // Handle user coming online
        // - Sets presence in Redis
        // - Joins all user's chat rooms
        // - Broadcasts online status
        // ----------------------------------------
        await handleUserOnline(io, socket);

        // ----------------------------------------
        // Handle disconnection
        // This is CRITICAL for cleanup:
        // - Update presence to offline
        // - Broadcast offline status
        // - Socket.io automatically removes all
        //   listeners and room memberships
        // ----------------------------------------
        socket.on('disconnect', async (reason) => {
            logger.info(`🔌 Socket disconnected: ${socket.user.username} (reason: ${reason})`);
            await handleUserOffline(io, socket);
        });

        // ----------------------------------------
        // Handle errors on individual sockets
        // Without this, unhandled errors could
        // crash the entire process
        // ----------------------------------------
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.user.username}:`, error);
        });
    });

    // Log adapter events
    io.of('/').adapter.on('error', (error) => {
        logger.error('Socket.io adapter error:', error);
    });

    logger.info('✅ Socket.io handlers initialized');
};

module.exports = { initializeSocketHandlers };
