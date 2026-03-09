/**
 * Database Initialization Script
 * 
 * Reads schema.sql and executes it against the Neon database.
 * Run with: npm run db:init
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/database');
const logger = require('../utils/logger');

const initDatabase = async () => {
    try {
        // Test connection first
        await testConnection();

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        logger.info('Running database schema...');
        await pool.query(schema);
        logger.info('✅ Database schema applied successfully');

        await pool.end();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};

initDatabase();
