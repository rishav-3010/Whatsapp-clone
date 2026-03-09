/**
 * Chat Controller
 * 
 * REST API endpoints for chat rooms:
 * GET    /api/chats        - List user's chats
 * POST   /api/chats        - Create a new chat
 * GET    /api/chats/:id    - Get chat details
 * POST   /api/chats/:id/members - Add member to group
 */

const chatService = require('../services/chatService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Get all chat rooms for the authenticated user
 * GET /api/chats
 */
const getUserChats = asyncHandler(async (req, res) => {
    const rooms = await chatService.getUserRooms(req.user.id);

    res.json({
        success: true,
        data: rooms,
    });
});

/**
 * Create a new chat (private or group)
 * POST /api/chats
 * Body: { targetUserId } for private, { name, memberIds } for group
 */
const createChat = asyncHandler(async (req, res) => {
    const { targetUserId, name, memberIds, isGroup } = req.body;

    let room;
    if (isGroup) {
        room = await chatService.createGroupChat(req.user.id, name, memberIds);
    } else {
        room = await chatService.createPrivateChat(req.user.id, targetUserId);
    }

    res.status(201).json({
        success: true,
        data: room,
    });
});

/**
 * Get chat room details with members
 * GET /api/chats/:id
 */
const getChatById = asyncHandler(async (req, res) => {
    const room = await chatService.getRoomById(req.params.id, req.user.id);

    res.json({
        success: true,
        data: room,
    });
});

/**
 * Add a member to a group chat
 * POST /api/chats/:id/members
 * Body: { userId }
 */
const addMember = asyncHandler(async (req, res) => {
    await chatService.addMember(req.params.id, req.user.id, req.body.userId);

    res.json({
        success: true,
        message: 'Member added successfully',
    });
});

module.exports = { getUserChats, createChat, getChatById, addMember };
