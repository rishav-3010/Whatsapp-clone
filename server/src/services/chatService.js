/**
 * Chat Service
 * 
 * Business logic for chat rooms:
 * - Creating private (1:1) and group chats
 * - Listing user's chat rooms with member info
 * - Managing room membership
 */

const { ChatRoomModel, RoomMemberModel, UserModel, getClient } = require('../models');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create a private (1:1) chat between two users
 * Returns existing room if one already exists
 * 
 * Uses a database TRANSACTION to ensure atomicity:
 * either both the room and memberships are created, or none.
 */
const createPrivateChat = async (userId, targetUserId) => {
    // Prevent chatting with yourself
    if (userId === targetUserId) {
        throw new AppError('Cannot create a chat with yourself', 400);
    }

    // Verify target user exists
    const targetUser = await UserModel.findById(targetUserId);
    if (targetUser.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    // Check if a private room already exists between these users
    const existingRoom = await ChatRoomModel.findPrivateRoom(userId, targetUserId);
    if (existingRoom.rows.length > 0) {
        return existingRoom.rows[0];
    }

    // Create new room in a transaction
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Create room
        const roomResult = await client.query(
            `INSERT INTO chat_rooms (name, is_group, created_by) 
       VALUES ($1, $2, $3) RETURNING *`,
            [null, false, userId]
        );
        const room = roomResult.rows[0];

        // Add both users as members
        await client.query(
            `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'admin')`,
            [room.id, userId]
        );
        await client.query(
            `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'member')`,
            [room.id, targetUserId]
        );

        await client.query('COMMIT');

        logger.info(`Private chat created between ${userId} and ${targetUserId}`);
        return room;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release(); // CRITICAL: always release the client back to pool
    }
};

/**
 * Create a group chat with multiple members
 */
const createGroupChat = async (userId, name, memberIds) => {
    if (!name || name.trim().length === 0) {
        throw new AppError('Group name is required', 400);
    }

    if (!memberIds || memberIds.length === 0) {
        throw new AppError('At least one member is required', 400);
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Create group room
        const roomResult = await client.query(
            `INSERT INTO chat_rooms (name, is_group, created_by) 
       VALUES ($1, $2, $3) RETURNING *`,
            [name, true, userId]
        );
        const room = roomResult.rows[0];

        // Add creator as admin
        await client.query(
            `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'admin')`,
            [room.id, userId]
        );

        // Add other members
        for (const memberId of memberIds) {
            await client.query(
                `INSERT INTO room_members (room_id, user_id, role) 
         VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
                [room.id, memberId]
            );
        }

        await client.query('COMMIT');

        logger.info(`Group chat "${name}" created by ${userId} with ${memberIds.length} members`);
        return room;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get all chat rooms for a user, including member info and last message
 */
const getUserRooms = async (userId) => {
    const result = await ChatRoomModel.findUserRooms(userId);
    return result.rows;
};

/**
 * Get room details with members
 */
const getRoomById = async (roomId, userId) => {
    // Verify user is a member
    const membership = await RoomMemberModel.isMember(roomId, userId);
    if (membership.rows.length === 0) {
        throw new AppError('You are not a member of this chat', 403);
    }

    const room = await ChatRoomModel.findById(roomId);
    if (room.rows.length === 0) {
        throw new AppError('Chat room not found', 404);
    }

    const members = await RoomMemberModel.getMembers(roomId);

    return {
        ...room.rows[0],
        members: members.rows,
    };
};

/**
 * Add a member to a group chat
 */
const addMember = async (roomId, userId, newMemberId) => {
    const room = await ChatRoomModel.findById(roomId);
    if (room.rows.length === 0) {
        throw new AppError('Chat room not found', 404);
    }

    if (!room.rows[0].is_group) {
        throw new AppError('Cannot add members to a private chat', 400);
    }

    await RoomMemberModel.addMember(roomId, newMemberId);
    logger.info(`User ${newMemberId} added to room ${roomId} by ${userId}`);
};

module.exports = {
    createPrivateChat,
    createGroupChat,
    getUserRooms,
    getRoomById,
    addMember,
};
