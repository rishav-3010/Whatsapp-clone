/**
 * Redis Configuration
 * 
 * Creates Redis clients for:
 * 1. General purpose commands (caching, presence)
 * 2. Pub/Sub (Socket.io adapter uses separate pub/sub clients)
 * 
 * Includes automatic reconnection with exponential backoff
 * to handle transient Redis failures gracefully.
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Create a Redis client with standard configuration
 * @param {string} name - Client identifier for logging
 * @returns {Redis} Configured Redis client
 */
const createRedisClient = (name = 'default') => {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        // Reconnection strategy with exponential backoff
        retryStrategy(times) {
            const delay = Math.min(times * 100, 5000);
            logger.warn(`Redis ${name} reconnecting... attempt ${times}, delay ${delay}ms`);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
    });

    client.on('connect', () => {
        logger.info(`✅ Redis ${name} client connected`);
    });

    client.on('ready', () => {
        logger.debug(`Redis ${name} client ready`);
    });

    client.on('error', (err) => {
        logger.error(`Redis ${name} client error:`, err.message);
    });

    client.on('close', () => {
        logger.warn(`Redis ${name} client connection closed`);
    });

    return client;
};

// Main Redis client for general operations
const redisClient = createRedisClient('main');

// Pub client for Socket.io Redis adapter
const redisPubClient = createRedisClient('pub');

// Sub client for Socket.io Redis adapter
const redisSubClient = createRedisClient('sub');

module.exports = {
    redisClient,
    redisPubClient,
    redisSubClient,
    createRedisClient,
};
