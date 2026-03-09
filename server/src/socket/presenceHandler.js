/**
 * Presence Socket Handler
 * 
 * Manages user online/offline status:
 * - On connection: set online in Redis, broadcast to relevant users
 * - On disconnection: set offline, update last_seen, broadcast
 * 
 * Redis Hash is the source of truth for presence data — this ensures
 * all server instances have a consistent view of who's online.
 */

const presenceService = require('../services/presenceService');
const { ChatRoomModel } = require('../models');
const logger = require('../utils/logger');

/**
 * Handle user coming online
 * Called during Socket.io connection (from socket/index.js)
 * 
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Individual socket connection
 */
const handleUserOnline = async (io, socket) => {
    try {
        // Set user as online in Redis + DB
        await presenceService.setOnline(socket.user.id, socket.id);

        // Get user's chat rooms to notify room members
        const rooms = await ChatRoomModel.findUserRooms(socket.user.id);

        // Join all user's rooms on connect (so they receive messages)
        for (const room of rooms.rows) {
            socket.join(room.id);
        }

        // Broadcast online status to all rooms the user belongs to
        const presenceUpdate = {
            userId: socket.user.id,
            username: socket.user.username,
            isOnline: true,
            lastSeen: new Date().toISOString(),
        };

        // Broadcast to all rooms (excluding sender)
        for (const room of rooms.rows) {
            socket.to(room.id).emit('presence:update', presenceUpdate);
        }

        logger.info(`👤 ${socket.user.username} came online (${socket.id})`);
    } catch (error) {
        logger.error('Error handling user online:', error);
    }
};

/**
 * Handle user going offline
 * Called during Socket.io disconnection
 * 
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Individual socket connection
 */
const handleUserOffline = async (io, socket) => {
    try {
        // Set user as offline in Redis + DB
        await presenceService.setOffline(socket.user.id);

        // Broadcast offline status
        const presenceUpdate = {
            userId: socket.user.id,
            username: socket.user.username,
            isOnline: false,
            lastSeen: new Date().toISOString(),
        };

        // Broadcast to all rooms the socket was in
        // socket.rooms includes all rooms the socket joined
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                // Skip the default room (socket.id)
                socket.to(room).emit('presence:update', presenceUpdate);
            }
        }

        logger.info(`👤 ${socket.user.username} went offline (${socket.id})`);
    } catch (error) {
        logger.error('Error handling user offline:', error);
    }
};

module.exports = { handleUserOnline, handleUserOffline };
