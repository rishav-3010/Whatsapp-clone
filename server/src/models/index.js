/**
 * Database Query Models
 * 
 * Centralized SQL queries organized by entity.
 * Uses parameterized queries to prevent SQL injection.
 * All queries return raw pg results — services handle the business logic.
 */

const { query, getClient } = require('../config/database');

// ==========================================
// User Queries
// ==========================================
const UserModel = {
    findById: (id) =>
        query('SELECT * FROM users WHERE id = $1', [id]),

    findByEmail: (email) =>
        query('SELECT * FROM users WHERE email = $1', [email]),

    findByUsername: (username) =>
        query('SELECT * FROM users WHERE username = $1', [username]),

    create: (username, email, passwordHash) =>
        query(
            `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, avatar_url, is_online, last_seen, created_at`,
            [username, email, passwordHash]
        ),

    updateOnlineStatus: (id, isOnline) =>
        query(
            `UPDATE users SET is_online = $1, last_seen = NOW(), updated_at = NOW() 
       WHERE id = $2`,
            [isOnline, id]
        ),

    searchByUsername: (searchTerm, limit = 20) =>
        query(
            `SELECT id, username, email, avatar_url, is_online, last_seen 
       FROM users 
       WHERE username ILIKE $1 
       LIMIT $2`,
            [`%${searchTerm}%`, limit]
        ),

    updateProfile: (id, updates) => {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.username) {
            fields.push(`username = $${paramIndex++}`);
            values.push(updates.username);
        }
        if (updates.avatar_url) {
            fields.push(`avatar_url = $${paramIndex++}`);
            values.push(updates.avatar_url);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        return query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, username, email, avatar_url, is_online, last_seen`,
            values
        );
    },
};

// ==========================================
// Chat Room Queries
// ==========================================
const ChatRoomModel = {
    create: (name, isGroup, createdBy) =>
        query(
            `INSERT INTO chat_rooms (name, is_group, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [name, isGroup, createdBy]
        ),

    findById: (id) =>
        query('SELECT * FROM chat_rooms WHERE id = $1', [id]),

    /**
     * Find or create a private (1:1) chat room between two users
     * Checks if a non-group room exists with exactly these two members
     */
    findPrivateRoom: (userId1, userId2) =>
        query(
            `SELECT cr.* FROM chat_rooms cr
       JOIN room_members rm1 ON cr.id = rm1.room_id AND rm1.user_id = $1
       JOIN room_members rm2 ON cr.id = rm2.room_id AND rm2.user_id = $2
       WHERE cr.is_group = FALSE`,
            [userId1, userId2]
        ),

    /**
     * Get all rooms for a user with the latest message preview
     */
    findUserRooms: (userId) =>
        query(
            `SELECT cr.*, 
              rm.joined_at,
              last_msg.content AS last_message,
              last_msg.created_at AS last_message_at,
              last_msg.sender_id AS last_message_sender_id,
              (
                SELECT json_agg(json_build_object(
                  'id', u.id, 
                  'username', u.username, 
                  'avatar_url', u.avatar_url,
                  'is_online', u.is_online
                ))
                FROM room_members rm2
                JOIN users u ON rm2.user_id = u.id
                WHERE rm2.room_id = cr.id
              ) AS members
       FROM chat_rooms cr
       JOIN room_members rm ON cr.id = rm.room_id AND rm.user_id = $1
       LEFT JOIN LATERAL (
         SELECT content, created_at, sender_id
         FROM messages
         WHERE room_id = cr.id
         ORDER BY created_at DESC
         LIMIT 1
       ) last_msg ON true
       ORDER BY COALESCE(last_msg.created_at, cr.created_at) DESC`,
            [userId]
        ),
};

// ==========================================
// Room Members Queries
// ==========================================
const RoomMemberModel = {
    addMember: (roomId, userId, role = 'member') =>
        query(
            `INSERT INTO room_members (room_id, user_id, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (room_id, user_id) DO NOTHING
       RETURNING *`,
            [roomId, userId, role]
        ),

    removeMember: (roomId, userId) =>
        query(
            'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
            [roomId, userId]
        ),

    getMembers: (roomId) =>
        query(
            `SELECT u.id, u.username, u.avatar_url, u.is_online, u.last_seen, rm.role
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1`,
            [roomId]
        ),

    isMember: (roomId, userId) =>
        query(
            'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
            [roomId, userId]
        ),
};

// ==========================================
// Message Queries
// ==========================================
const MessageModel = {
    create: (roomId, senderId, content, messageType = 'text') =>
        query(
            `INSERT INTO messages (room_id, sender_id, content, message_type) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [roomId, senderId, content, messageType]
        ),

    /**
     * Cursor-based pagination for chat history
     * Fetches messages BEFORE the cursor (older messages)
     * Fetches limit+1 to determine if there are more results
     */
    getByRoom: (roomId, cursor, limit = 50) => {
        if (cursor) {
            return query(
                `SELECT m.*, u.username AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.room_id = $1 AND m.created_at < $2
         ORDER BY m.created_at DESC
         LIMIT $3`,
                [roomId, cursor, limit + 1]
            );
        }
        return query(
            `SELECT m.*, u.username AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
            [roomId, limit + 1]
        );
    },

    updateStatus: (messageId, status) =>
        query(
            `UPDATE messages SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
            [status, messageId]
        ),

    findById: (id) =>
        query('SELECT * FROM messages WHERE id = $1', [id]),
};

// ==========================================
// Read Receipt Queries
// ==========================================
const ReadReceiptModel = {
    create: (messageId, userId) =>
        query(
            `INSERT INTO read_receipts (message_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (message_id, user_id) DO NOTHING
       RETURNING *`,
            [messageId, userId]
        ),

    getByMessage: (messageId) =>
        query(
            `SELECT rr.*, u.username 
       FROM read_receipts rr
       JOIN users u ON rr.user_id = u.id
       WHERE rr.message_id = $1`,
            [messageId]
        ),
};

module.exports = {
    UserModel,
    ChatRoomModel,
    RoomMemberModel,
    MessageModel,
    ReadReceiptModel,
    getClient,
};
