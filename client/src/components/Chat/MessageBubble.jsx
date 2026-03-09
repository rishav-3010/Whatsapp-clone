/**
 * Message Bubble Component
 * 
 * Displays a single message with:
 * - Sender name (for group chats)
 * - Message content
 * - Timestamp
 * - Read receipt status (✓ sent, ✓✓ delivered, ✓✓ blue = read)
 */

const MessageBubble = ({ message, isOwn, showAvatar }) => {
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderStatus = (status) => {
        switch (status) {
            case 'sent':
                return <span className="msg-status sent">✓</span>;
            case 'delivered':
                return <span className="msg-status delivered">✓✓</span>;
            case 'read':
                return <span className="msg-status read">✓✓</span>;
            default:
                return <span className="msg-status sending">⏳</span>;
        }
    };

    return (
        <div className={`message-row ${isOwn ? 'own' : 'other'}`}>
            {!isOwn && showAvatar && (
                <div className="message-avatar">
                    <div className="avatar small">
                        {(message.sender_name || '?').charAt(0).toUpperCase()}
                    </div>
                </div>
            )}
            <div className={`message-bubble ${isOwn ? 'own' : 'other'} ${!showAvatar && !isOwn ? 'no-avatar' : ''}`}>
                {!isOwn && showAvatar && (
                    <span className="message-sender">{message.sender_name}</span>
                )}
                <p className="message-content">{message.content}</p>
                <div className="message-meta">
                    <span className="message-time">{formatTime(message.created_at)}</span>
                    {isOwn && renderStatus(message.status)}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
