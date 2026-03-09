/**
 * Socket.io Client Singleton
 * 
 * Creates a single Socket.io connection that:
 * - Authenticates with JWT token in handshake
 * - Auto-reconnects with exponential backoff
 * - Provides connection status tracking
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Initialize or get existing socket connection
 * @param {string} token - JWT access token
 * @returns {Socket} Socket.io client instance
 */
export const getSocket = (token) => {
    if (socket && socket.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        // Reconnection configuration
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,        // Start at 1s
        reconnectionDelayMax: 10000,    // Max 10s between attempts
        randomizationFactor: 0.5,       // Add jitter to prevent thundering herd
        // Timeouts
        timeout: 20000,
    });

    // Connection lifecycle logging
    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_error', (error) => {
        console.log('❌ Reconnection error:', error.message);
    });

    socket.on('connect_error', (error) => {
        console.log('❌ Connection error:', error.message);
        // If auth error, might need to re-login
        if (error.message === 'Authentication failed') {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }
    });

    return socket;
};

/**
 * Disconnect and clean up socket
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export default { getSocket, disconnectSocket };
