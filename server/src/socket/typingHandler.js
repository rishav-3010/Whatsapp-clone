/**
 * Typing Indicator Socket Handler
 * 
 * Handles typing events:
 * - typing:start → Broadcast typing indicator to room
 * - typing:stop → Clear typing indicator
 * 
 * Typing indicators are ephemeral — they are NOT persisted.
 * They only need to reach currently connected clients.
 * The Redis adapter handles cross-server broadcasting.
 */

const logger = require('../utils/logger');

/**
 * Register typing event handlers on a socket connection
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Individual socket connection
 */
const registerTypingHandlers = (io, socket) => {
    /**
     * User starts typing
     * Broadcasts to ALL other users in the room (excluding sender)
     */
    socket.on('typing:start', (data) => {
        const { roomId } = data;

        if (!roomId) return;

        // socket.to(roomId) = broadcast to room EXCEPT sender
        // (we don't want to send typing indicator back to the typer)
        socket.to(roomId).emit('typing:update', {
            roomId,
            userId: socket.user.id,
            username: socket.user.username,
            isTyping: true,
        });
    });

    /**
     * User stops typing
     * Broadcasts to ALL other users in the room (excluding sender)
     */
    socket.on('typing:stop', (data) => {
        const { roomId } = data;

        if (!roomId) return;

        socket.to(roomId).emit('typing:update', {
            roomId,
            userId: socket.user.id,
            username: socket.user.username,
            isTyping: false,
        });
    });
};

module.exports = registerTypingHandlers;
