/**
 * useChat Hook
 * 
 * Manages all chat-related state and Socket.io event bindings:
 * - Chat rooms list
 * - Active chat messages
 * - Typing indicators
 * - Presence updates
 * - Message status updates
 * - Sending messages
 * - Loading message history
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const useChat = () => {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});
    const [onlineUsers, setOnlineUsers] = useState({});
    const [pagination, setPagination] = useState({ hasMore: false, nextCursor: null });
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(true);

    const typingTimeoutRef = useRef(null);
    const activeRoomRef = useRef(null);

    // Keep ref in sync with state
    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);

    // ==========================================
    // Load chat rooms
    // ==========================================
    const loadRooms = useCallback(async () => {
        try {
            setLoadingRooms(true);
            const response = await api.get('/chats');
            setRooms(response.data.data);
        } catch (error) {
            console.error('Failed to load rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    }, []);

    // Load rooms on mount
    useEffect(() => {
        loadRooms();
    }, [loadRooms]);

    // ==========================================
    // Load messages for active room
    // ==========================================
    const loadMessages = useCallback(async (roomId, cursor = null) => {
        try {
            setLoadingMessages(true);
            const params = { limit: 50 };
            if (cursor) params.cursor = cursor;

            const response = await api.get(`/chats/${roomId}/messages`, { params });
            const newMessages = response.data.data.reverse(); // Oldest first

            if (cursor) {
                // Loading older messages — prepend
                setMessages((prev) => [...newMessages, ...prev]);
            } else {
                // Initial load
                setMessages(newMessages);
            }

            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // ==========================================
    // Socket.io event bindings
    // ==========================================
    useEffect(() => {
        if (!socket || !isConnected) return;

        // --- New message received ---
        const handleNewMessage = (message) => {
            // Add to messages if active room matches
            if (activeRoomRef.current?.id === message.room_id) {
                setMessages((prev) => [...prev, message]);

                // Auto-mark as read if it's not ours
                if (message.sender_id !== user.id) {
                    socket.emit('message:read', {
                        messageId: message.id,
                        roomId: message.room_id,
                    });
                }
            }

            // Update room list with last message
            setRooms((prevRooms) =>
                prevRooms.map((room) =>
                    room.id === message.room_id
                        ? { ...room, last_message: message.content, last_message_at: message.created_at }
                        : room
                ).sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
            );
        };

        // --- Typing indicator ---
        const handleTypingUpdate = (data) => {
            if (data.userId === user.id) return;

            setTypingUsers((prev) => {
                if (data.isTyping) {
                    return { ...prev, [data.userId]: data.username };
                }
                const { [data.userId]: _, ...rest } = prev;
                return rest;
            });
        };

        // --- Presence update ---
        const handlePresenceUpdate = (data) => {
            setOnlineUsers((prev) => ({
                ...prev,
                [data.userId]: {
                    isOnline: data.isOnline,
                    lastSeen: data.lastSeen,
                },
            }));
        };

        // --- Message status update (read receipts) ---
        const handleMessageStatus = (data) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === data.messageId ? { ...msg, status: data.status } : msg
                )
            );
        };

        // --- New room notification ---
        const handleNewRoom = () => {
            loadRooms(); // Refresh rooms list
        };

        socket.on('message:new', handleNewMessage);
        socket.on('typing:update', handleTypingUpdate);
        socket.on('presence:update', handlePresenceUpdate);
        socket.on('message:status', handleMessageStatus);
        socket.on('room:new', handleNewRoom);

        // Cleanup listeners on unmount (prevent memory leaks!)
        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('typing:update', handleTypingUpdate);
            socket.off('presence:update', handlePresenceUpdate);
            socket.off('message:status', handleMessageStatus);
            socket.off('room:new', handleNewRoom);
        };
    }, [socket, isConnected, user]);

    // ==========================================
    // Actions
    // ==========================================

    /**
     * Select a chat room — join room, load messages
     */
    const selectRoom = useCallback(async (room) => {
        // Leave previous room
        if (activeRoom && socket) {
            socket.emit('room:leave', { roomId: activeRoom.id });
        }

        setActiveRoom(room);
        setMessages([]);
        setTypingUsers({});

        if (socket) {
            socket.emit('room:join', { roomId: room.id });
        }

        await loadMessages(room.id);
    }, [activeRoom, socket, loadMessages]);

    /**
     * Send a message in the active room
     */
    const sendMessage = useCallback((content) => {
        if (!socket || !activeRoom || !content.trim()) return;

        socket.emit('message:send', {
            roomId: activeRoom.id,
            content: content.trim(),
            type: 'text',
        });

        // Stop typing indicator
        socket.emit('typing:stop', { roomId: activeRoom.id });
    }, [socket, activeRoom]);

    /**
     * Send typing indicator with debounce
     */
    const handleTyping = useCallback(() => {
        if (!socket || !activeRoom) return;

        socket.emit('typing:start', { roomId: activeRoom.id });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Auto-stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { roomId: activeRoom.id });
        }, 3000);
    }, [socket, activeRoom]);

    /**
     * Create a new private chat
     */
    const createPrivateChat = useCallback(async (targetUserId) => {
        try {
            const response = await api.post('/chats', { targetUserId });
            const room = response.data.data;
            await loadRooms();
            return room;
        } catch (error) {
            console.error('Failed to create chat:', error);
            throw error;
        }
    }, [loadRooms]);

    /**
     * Load older messages (infinite scroll)
     */
    const loadMoreMessages = useCallback(() => {
        if (activeRoom && pagination.hasMore && pagination.nextCursor && !loadingMessages) {
            loadMessages(activeRoom.id, pagination.nextCursor);
        }
    }, [activeRoom, pagination, loadingMessages, loadMessages]);

    return {
        rooms,
        activeRoom,
        messages,
        typingUsers,
        onlineUsers,
        pagination,
        loadingMessages,
        loadingRooms,
        selectRoom,
        sendMessage,
        handleTyping,
        createPrivateChat,
        loadMoreMessages,
        loadRooms,
    };
};

export default useChat;
