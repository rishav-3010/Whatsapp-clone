/**
 * Message Controller
 * 
 * REST API endpoint for message history (paginated):
 * GET /api/chats/:id/messages?cursor=<timestamp>&limit=50
 */

const messageService = require('../services/messageService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Get paginated message history for a chat room
 * GET /api/chats/:id/messages
 * Query params: cursor (ISO timestamp), limit (default 50)
 */
const getMessages = asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;

    const result = await messageService.getMessages(
        req.params.id,
        req.user.id,
        cursor || null,
        parseInt(limit) || 50
    );

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

module.exports = { getMessages };
