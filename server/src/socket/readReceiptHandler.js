/**
 * Read Receipt Socket Handler
 * 
 * Handles message read/delivery status events:
 * - message:read → Mark message as read, notify sender
 * 
 * Read receipts are persisted in the database AND broadcast
 * in real-time so the sender sees the status change instantly.
 */

const messageService = require('../services/messageService');
const logger = require('../utils/logger');

/**
 * Register read receipt event handlers on a socket connection
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Individual socket connection
 */
const registerReadReceiptHandlers = (io, socket) => {
    /**
     * Mark a message as read
     * 
     * Flow:
     * 1. Client opens a chat / scrolls to a message
     * 2. Client emits 'message:read' with { messageId, roomId }
     * 3. Server persists read receipt to DB
     * 4. Server emits 'message:status' to the room with updated status
     *    → Sender sees their message turn from ✓ to ✓✓ (blue)
     */
    socket.on('message:read', async (data) => {
        try {
            const { messageId, roomId } = data;

            if (!messageId || !roomId) return;

            // Persist read receipt and update message status
            const updatedMessage = await messageService.markAsRead(
                messageId,
                socket.user.id
            );

            if (updatedMessage) {
                // Broadcast updated status to the room
                io.to(roomId).emit('message:status', {
                    messageId,
                    status: 'read',
                    readBy: {
                        userId: socket.user.id,
                        username: socket.user.username,
                        readAt: new Date().toISOString(),
                    },
                });
            }
        } catch (error) {
            logger.error('Error processing read receipt:', error);
        }
    });
};

module.exports = registerReadReceiptHandlers;
