/**
 * Database Configuration - Neon PostgreSQL
 * 
 * Uses pg (node-postgres) with connection pooling for efficient
 * database access. Neon serverless driver is compatible with pg.
 * 
 * Connection pool settings are tuned for production:
 * - max: 20 connections per server instance
 * - idleTimeoutMillis: close idle connections after 30s
 * - connectionTimeoutMillis: fail fast if DB is unreachable
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 20,                      // Max connections in pool
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout if connection takes > 5s
});

// Log pool events for monitoring
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
  // Don't crash the process — pool will attempt reconnection
});

/**
 * Execute a SQL query with parameterized values
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 80)}...`);
    return result;
  } catch (error) {
    logger.error(`Query failed: ${text}`, { error: error.message, params });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Pool client
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Test the database connection
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    logger.info(`✅ Database connected successfully at ${result.rows[0].now}`);
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

module.exports = { pool, query, getClient, testConnection };
