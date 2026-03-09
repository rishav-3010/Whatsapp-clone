/**
 * Chat Window Component
 * 
 * Main chat area showing:
 * - Room header with name, online status
 * - Message list with auto-scroll
 * - Typing indicator
 * - Message input with send button
 */

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({
    activeRoom,
    messages,
    typingUsers,
    onSendMessage,
    onTyping,
    loadMoreMessages,
    loadingMessages,
    pagination,
    currentUser,
    onlineUsers,
    isConnected
}) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Infinite scroll — load older messages
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (container && container.scrollTop === 0 && pagination.hasMore && !loadingMessages) {
            loadMoreMessages();
        }
    };

    if (!activeRoom) {
        return (
            <div className="chat-window-empty">
                <div className="empty-state">
                    <svg viewBox="0 0 303 172" width="250" fill="none">
                        <path d="M229.565 160.229c32.647-15.695 50.862-51.199 43.424-88.025C265.436 35.06 227.455 7.04 189.606 1.547c-37.849-5.493-77.94 7.671-103.845 34.234-25.905 26.563-33.393 64.862-21.072 98.588" stroke="#00d4aa" strokeWidth="1.5" />
                        <path d="M202.326 43.402c-7.827-4.713-17.412-7.47-27.655-7.47-29.624 0-53.728 23.738-53.728 53.243 0 9.688 2.578 18.754 7.074 26.59l-7.447 27.277 28.021-7.293c7.413 3.956 15.912 6.224 24.976 6.224h.022c29.604 0 53.714-23.737 53.714-53.255 0-14.222-5.563-27.637-15.676-37.728" stroke="#00d4aa" strokeWidth="1.5" />
                        <circle cx="153" cy="89" r="4" fill="#00d4aa" />
                        <circle cx="174" cy="89" r="4" fill="#00d4aa" />
                        <circle cx="195" cy="89" r="4" fill="#00d4aa" />
                    </svg>
                    <h2>WhatsApp Clone</h2>
                    <p>Select a chat or start a new conversation</p>
                    {!isConnected && (
                        <div className="connection-warning">
                            <span className="warning-dot"></span>
                            Connecting to server...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const roomName = activeRoom.is_group
        ? activeRoom.name
        : activeRoom.members?.map(m => m.username).join(', ') || 'Chat';

    const isOnline = activeRoom.members?.some(m => onlineUsers[m.id]?.isOnline);

    return (
        <div className="chat-window">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <div className="avatar chat-header-avatar">
                        {roomName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="chat-header-name">{roomName}</h3>
                        <span className="chat-header-status">
                            {Object.keys(typingUsers).length > 0
                                ? `${Object.values(typingUsers).join(', ')} typing...`
                                : isOnline ? 'Online' : 'Offline'
                            }
                        </span>
                    </div>
                </div>
                {!isConnected && (
                    <div className="connection-badge">
                        <span className="warning-dot"></span>
                        Reconnecting...
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div
                className="messages-container"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {loadingMessages && (
                    <div className="loading-messages">
                        <span className="spinner"></span>
                        Loading messages...
                    </div>
                )}

                {messages.map((message, index) => (
                    <MessageBubble
                        key={message.id || index}
                        message={message}
                        isOwn={message.sender_id === currentUser?.id}
                        showAvatar={
                            index === 0 ||
                            messages[index - 1]?.sender_id !== message.sender_id
                        }
                    />
                ))}

                {Object.keys(typingUsers).length > 0 && (
                    <TypingIndicator users={Object.values(typingUsers)} />
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput onSend={onSendMessage} onTyping={onTyping} />
        </div>
    );
};

export default ChatWindow;
