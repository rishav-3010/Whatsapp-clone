/**
 * Message Input Component
 * Handles text input and send actions
 */

import { useState, useRef } from 'react';

const MessageInput = ({ onSend, onTyping }) => {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSend(message);
            setMessage('');
            inputRef.current?.focus();
        }
    };

    const handleChange = (e) => {
        setMessage(e.target.value);
        onTyping();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="message-input-container" onSubmit={handleSubmit}>
            <div className="message-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    className="message-input"
                    autoFocus
                />
            </div>
            <button
                type="submit"
                className="send-btn"
                disabled={!message.trim()}
            >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
            </button>
        </form>
    );
};

export default MessageInput;
