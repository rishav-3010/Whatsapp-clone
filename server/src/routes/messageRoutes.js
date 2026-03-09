/**
 * Message Routes
 * 
 * GET /api/chats/:id/messages - Get paginated message history
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateHTTP } = require('../middleware/auth');

router.use(authenticateHTTP);

// Get messages for a specific chat room (with cursor-based pagination)
router.get('/:id/messages', messageController.getMessages);

module.exports = router;
