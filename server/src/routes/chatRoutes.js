/**
 * Chat Routes
 * 
 * All routes require JWT authentication
 * GET    /api/chats            - List user's chats
 * POST   /api/chats            - Create chat
 * GET    /api/chats/:id        - Get chat details
 * POST   /api/chats/:id/members - Add member to group
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateHTTP } = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticateHTTP);

router.get('/', chatController.getUserChats);
router.post('/', chatController.createChat);
router.get('/:id', chatController.getChatById);
router.post('/:id/members', chatController.addMember);

module.exports = router;
