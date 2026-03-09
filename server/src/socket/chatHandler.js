/**
 * Chat Socket Handler
 * 
 * Handles real-time messaging events:
 * - message:send → Persist and broadcast to room
 * - room:join → Join a Socket.io room
 * - room:leave → Leave a Socket.io room
 * 
 * The Redis adapter ensures messages are broadcast to clients
 * connected to ANY server instance — not just the local one.
 */

const messageService = require('../services/messageService');
const { UserModel } = require('../models');
const logger = require('../utils/logger');

/**
 * Register chat event handlers on a socket connection
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Individual socket connection
 */
const registerChatHandlers = (io, socket) => {
    /**
     * Handle incoming message
     * 
     * Flow:
     * 1. Client emits 'message:send' with { roomId, content, type }
     * 2. Server persists message to Neon DB
     * 3. Server emits 'message:new' to ALL clients in the room
     *    (via Redis adapter → reaches clients on all server instances)
     * 4. Server emits 'message:status' back to sender with confirmation
     */
    socket.on('message:send', async (data, callback) => {
        try {
            const { roomId, content, type } = data;

            if (!roomId || !content) {
                return callback?.({ error: 'Room ID and content are required' });
            }

            // Persist message to database
            const message = await messageService.sendMessage(
                roomId,
                socket.user.id,
                content,
                type || 'text'
            );

            // Enrich message with sender info
            const enrichedMessage = {
                ...message,
                sender_name: socket.user.username,
            };

            // Broadcast to ALL clients in the room (including sender)
            // io.to(roomId) uses Redis adapter → multi-server broadcast
            io.to(roomId).emit('message:new', enrichedMessage);

            // Acknowledge receipt to sender
            callback?.({ success: true, message: enrichedMessage });

            logger.debug(`Message sent by ${socket.user.username} in room ${roomId}`);
        } catch (error) {
            logger.error('Error sending message:', error);
            callback?.({ error: error.message || 'Failed to send message' });
        }
    });

    /**
     * Join a Socket.io room
     * Socket.io rooms are lightweight — joining is just adding a reference
     * This lets us use io.to(roomId).emit() for targeted broadcasting
     */
    socket.on('room:join', async (data, callback) => {
        try {
            const { roomId } = data;

            if (!roomId) {
                return callback?.({ error: 'Room ID is required' });
            }

            // Join the Socket.io room
            socket.join(roomId);

            // Mark messages as delivered for this user
            await messageService.markAsDelivered(roomId, socket.user.id);

            logger.debug(`${socket.user.username} joined room ${roomId}`);
            callback?.({ success: true });
        } catch (error) {
            logger.error('Error joining room:', error);
            callback?.({ error: error.message });
        }
    });

    /**
     * Leave a Socket.io room
     */
    socket.on('room:leave', (data) => {
        const { roomId } = data;
        if (roomId) {
            socket.leave(roomId);
            logger.debug(`${socket.user.username} left room ${roomId}`);
        }
    });
};

module.exports = registerChatHandlers;
