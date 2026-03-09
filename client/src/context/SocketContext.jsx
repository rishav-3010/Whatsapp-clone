/**
 * Socket Context Provider
 * 
 * Manages the Socket.io connection lifecycle:
 * - Connects when user is authenticated
 * - Disconnects on logout
 * - Provides socket instance to all components
 * - Tracks connection status for UI indicators
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated) {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const socketInstance = getSocket(token);
            socketRef.current = socketInstance;
            setSocket(socketInstance);

            const handleConnect = () => setIsConnected(true);
            const handleDisconnect = () => setIsConnected(false);

            socketInstance.on('connect', handleConnect);
            socketInstance.on('disconnect', handleDisconnect);

            // Set initial connection state
            if (socketInstance.connected) {
                setIsConnected(true);
            }

            return () => {
                socketInstance.off('connect', handleConnect);
                socketInstance.off('disconnect', handleDisconnect);
            };
        } else {
            disconnectSocket();
            setSocket(null);
            setIsConnected(false);
        }
    }, [isAuthenticated]);

    const value = {
        socket,
        isConnected,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
