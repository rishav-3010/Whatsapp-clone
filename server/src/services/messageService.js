/**
 * Message Service
 * 
 * Business logic for messages:
 * - Sending messages (persist to DB)
 * - Fetching paginated message history (cursor-based)
 * - Updating message delivery/read status
 */

const { MessageModel, RoomMemberModel, ReadReceiptModel } = require('../models');
const { AppError, paginateResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Send a new message to a chat room
 * @param {string} roomId - Target room ID
 * @param {string} senderId - Sender's user ID
 * @param {string} content - Message content
 * @param {string} messageType - 'text', 'image', 'file', 'system'
 * @returns {Object} Created message with sender info
 */
const sendMessage = async (roomId, senderId, content, messageType = 'text') => {
    // Verify sender is a member of the room
    const membership = await RoomMemberModel.isMember(roomId, senderId);
    if (membership.rows.length === 0) {
        throw new AppError('You are not a member of this chat room', 403);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
        throw new AppError('Message content cannot be empty', 400);
    }

    // Persist message to database
    const result = await MessageModel.create(roomId, senderId, content.trim(), messageType);
    const message = result.rows[0];

    logger.debug(`Message sent in room ${roomId} by ${senderId}`);

    return message;
};

/**
 * Get paginated message history for a room
 * Uses cursor-based pagination for consistent results
 * even when new messages are being added in real-time
 * 
 * @param {string} roomId - Room ID
 * @param {string} userId - Requesting user ID (for auth check)
 * @param {string} cursor - ISO timestamp cursor (created_at of last seen message)
 * @param {number} limit - Number of messages to fetch
 * @returns {Object} Paginated messages
 */
const getMessages = async (roomId, userId, cursor, limit = 50) => {
    // Verify user is a member of the room
    const membership = await RoomMemberModel.isMember(roomId, userId);
    if (membership.rows.length === 0) {
        throw new AppError('You are not a member of this chat room', 403);
    }

    const result = await MessageModel.getByRoom(roomId, cursor, limit);

    return paginateResponse(result.rows, limit);
};

/**
 * Mark a message as read by a user
 * Creates a read receipt and updates message status
 * 
 * @param {string} messageId - Message ID
 * @param {string} userId - User who read the message
 * @returns {Object} Updated message
 */
const markAsRead = async (messageId, userId) => {
    const message = await MessageModel.findById(messageId);
    if (message.rows.length === 0) {
        throw new AppError('Message not found', 404);
    }

    // Don't create receipt for own messages
    if (message.rows[0].sender_id === userId) {
        return message.rows[0];
    }

    // Create read receipt (idempotent — ON CONFLICT DO NOTHING)
    await ReadReceiptModel.create(messageId, userId);

    // Update message status to 'read'
    const updated = await MessageModel.updateStatus(messageId, 'read');

    return updated.rows[0];
};

/**
 * Mark messages as delivered when user connects
 * Updates all unread messages in rooms the user belongs to
 */
const markAsDelivered = async (roomId, userId) => {
    const membership = await RoomMemberModel.isMember(roomId, userId);
    if (membership.rows.length === 0) return;

    // Use a raw query for bulk update efficiency
    const { query } = require('../config/database');
    await query(
        `UPDATE messages 
     SET status = 'delivered', updated_at = NOW()
     WHERE room_id = $1 
       AND sender_id != $2 
       AND status = 'sent'`,
        [roomId, userId]
    );
};

module.exports = {
    sendMessage,
    getMessages,
    markAsRead,
    markAsDelivered,
};
