/**
 * Presence Service
 * 
 * Tracks user online/offline status using Redis for:
 * 1. Fast reads (no DB queries for presence checks)
 * 2. Cross-server consistency (all instances read from same Redis)
 * 3. Automatic expiry via Redis TTL (handles crashed servers)
 * 
 * Data structure: Redis Hash "presence:users"
 * Key: userId, Value: JSON { isOnline, lastSeen, socketId }
 */

const { redisClient } = require('../config/redis');
const { UserModel } = require('../models');
const logger = require('../utils/logger');

const PRESENCE_KEY = 'presence:users';
const PRESENCE_TTL = 300; // 5 minutes TTL for individual user presence

/**
 * Set a user as online
 * Called when a WebSocket connection is established
 * 
 * @param {string} userId 
 * @param {string} socketId - Socket.io socket ID for this connection
 */
const setOnline = async (userId, socketId) => {
    const presenceData = JSON.stringify({
        isOnline: true,
        lastSeen: new Date().toISOString(),
        socketId,
    });

    // Store in Redis hash (O(1) for set/get)
    await redisClient.hset(PRESENCE_KEY, userId, presenceData);

    // Also update database (eventual consistency for offline queries)
    await UserModel.updateOnlineStatus(userId, true);

    logger.debug(`User ${userId} set as online (socket: ${socketId})`);
};

/**
 * Set a user as offline
 * Called when a WebSocket connection is lost
 * 
 * @param {string} userId 
 */
const setOffline = async (userId) => {
    const presenceData = JSON.stringify({
        isOnline: false,
        lastSeen: new Date().toISOString(),
        socketId: null,
    });

    await redisClient.hset(PRESENCE_KEY, userId, presenceData);
    await UserModel.updateOnlineStatus(userId, false);

    logger.debug(`User ${userId} set as offline`);
};

/**
 * Get online status for a single user
 * @param {string} userId 
 * @returns {Object} { isOnline, lastSeen }
 */
const getStatus = async (userId) => {
    const data = await redisClient.hget(PRESENCE_KEY, userId);

    if (data) {
        return JSON.parse(data);
    }

    // Fallback to database if not in Redis cache
    const result = await UserModel.findById(userId);
    if (result.rows.length > 0) {
        return {
            isOnline: result.rows[0].is_online,
            lastSeen: result.rows[0].last_seen,
        };
    }

    return { isOnline: false, lastSeen: null };
};

/**
 * Get online status for multiple users at once
 * Uses Redis HMGET for batch operation efficiency
 * 
 * @param {string[]} userIds 
 * @returns {Object} Map of userId -> { isOnline, lastSeen }
 */
const getBulkStatus = async (userIds) => {
    if (!userIds || userIds.length === 0) return {};

    const results = await redisClient.hmget(PRESENCE_KEY, ...userIds);
    const statusMap = {};

    userIds.forEach((userId, index) => {
        if (results[index]) {
            statusMap[userId] = JSON.parse(results[index]);
        } else {
            statusMap[userId] = { isOnline: false, lastSeen: null };
        }
    });

    return statusMap;
};

/**
 * Get all currently online users
 * @returns {string[]} Array of online user IDs
 */
const getOnlineUsers = async () => {
    const allPresence = await redisClient.hgetall(PRESENCE_KEY);
    const onlineUsers = [];

    for (const [userId, data] of Object.entries(allPresence)) {
        const parsed = JSON.parse(data);
        if (parsed.isOnline) {
            onlineUsers.push(userId);
        }
    }

    return onlineUsers;
};

module.exports = {
    setOnline,
    setOffline,
    getStatus,
    getBulkStatus,
    getOnlineUsers,
};
