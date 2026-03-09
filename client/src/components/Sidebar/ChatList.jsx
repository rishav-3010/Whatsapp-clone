/**
 * Chat List Component
 * Shows all chat rooms with last message preview and online indicator
 */

const ChatList = ({ rooms, activeRoom, onSelectRoom, onlineUsers, loading }) => {
    if (loading) {
        return (
            <div className="chat-list-loading">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="chat-item-skeleton">
                        <div className="skeleton-avatar"></div>
                        <div className="skeleton-text">
                            <div className="skeleton-line"></div>
                            <div className="skeleton-line short"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className="chat-list-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
                <p>No chats yet</p>
                <p className="hint">Click + to start a new conversation</p>
            </div>
        );
    }

    const getDisplayName = (room) => {
        if (room.is_group) return room.name;
        // For private chats, show the other user's name
        const otherMember = room.members?.find((m) => m.username !== undefined);
        if (room.members && room.members.length > 0) {
            const other = room.members.find(m => !room.name);
            return room.members.map(m => m.username).join(', ') || 'Chat';
        }
        return room.name || 'Chat';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / 86400000);

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="chat-list">
            {rooms.map((room) => {
                const displayName = getDisplayName(room);
                const isActive = activeRoom?.id === room.id;

                return (
                    <div
                        key={room.id}
                        className={`chat-item ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectRoom(room)}
                    >
                        <div className="chat-item-avatar">
                            <div className="avatar">
                                {displayName?.charAt(0).toUpperCase()}
                            </div>
                            {room.members?.some((m) => onlineUsers[m.id]?.isOnline) && (
                                <span className="online-dot"></span>
                            )}
                        </div>
                        <div className="chat-item-content">
                            <div className="chat-item-top">
                                <span className="chat-item-name">{displayName}</span>
                                <span className="chat-item-time">
                                    {formatTime(room.last_message_at)}
                                </span>
                            </div>
                            <p className="chat-item-preview">
                                {room.last_message || 'No messages yet'}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChatList;
