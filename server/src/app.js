/**
 * Application Entry Point
 * 
 * Bootstraps the entire server:
 * 1. Load environment variables
 * 2. Create Express app with middleware
 * 3. Mount REST API routes
 * 4. Create HTTP server
 * 5. Initialize Socket.io with Redis adapter
 * 6. Register WebSocket event handlers
 * 7. Connect to database
 * 8. Start listening
 * 
 * Architecture:
 * ┌─────────────────────────────────┐
 * │         HTTP Server             │
 * │  ┌──────────┐  ┌────────────┐  │
 * │  │  Express  │  │  Socket.io │  │
 * │  │  REST API │  │  WebSocket │  │
 * │  └──────────┘  └──────┬─────┘  │
 * │                       │        │
 * │                 ┌─────┴─────┐  │
 * │                 │   Redis   │  │
 * │                 │  Adapter  │  │
 * │                 └───────────┘  │
 * └─────────────────────────────────┘
 */

// Load environment variables FIRST (before any other imports)
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Config
const { testConnection } = require('./config/database');
const { createSocketServer } = require('./config/socket');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

// Socket handlers
const { initializeSocketHandlers } = require('./socket');

const logger = require('./utils/logger');

// ==========================================
// Create Express App
// ==========================================
const app = express();

// ==========================================
// Global Middleware
// ==========================================

// Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS — allow requests from the React frontend
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// HTTP request logging (dev format in development, combined in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// ==========================================
// REST API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', messageRoutes);  // /api/chats/:id/messages
app.use('/api/users', userRoutes);

// Health check endpoint (for load balancer / Docker health checks)
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { message: `Route ${req.originalUrl} not found` },
    });
});

// Global error handler (must be last middleware)
app.use(errorHandler);

// ==========================================
// Create HTTP Server & Socket.io
// ==========================================
const server = http.createServer(app);
const io = createSocketServer(server);

// Initialize WebSocket event handlers
initializeSocketHandlers(io);

// Make io accessible to routes if needed
app.set('io', io);

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        // Test database connection
        await testConnection();

        // Start listening
        server.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════╗
║   🚀 WhatsApp Clone Server Running        ║
║   📡 Port: ${PORT}                            ║
║   🌍 Env: ${process.env.NODE_ENV || 'development'}                  ║
║   🔗 Client: ${process.env.CLIENT_URL}      ║
╚════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// ==========================================
// Graceful Shutdown
// ==========================================
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(() => {
        logger.info('HTTP server closed');
        // Close database pool
        require('./config/database').pool.end();
        // Close Redis connections
        const { redisClient, redisPubClient, redisSubClient } = require('./config/redis');
        redisClient.quit();
        redisPubClient.quit();
        redisSubClient.quit();

        logger.info('All connections closed. Goodbye!');
        process.exit(0);
    });

    // Force shutdown after 10 seconds if graceful fails
    setTimeout(() => {
        logger.error('Forced shutdown after 10s timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startServer();

module.exports = { app, server, io };
