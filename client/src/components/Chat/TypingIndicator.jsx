/**
 * Typing Indicator Component
 * Animated bouncing dots showing who's typing
 */

const TypingIndicator = ({ users }) => {
    const text = users.length === 1
        ? `${users[0]} is typing`
        : users.length === 2
            ? `${users[0]} and ${users[1]} are typing`
            : `${users[0]} and ${users.length - 1} others are typing`;

    return (
        <div className="typing-indicator">
            <div className="typing-bubble">
                <div className="typing-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                </div>
                <span className="typing-text">{text}</span>
            </div>
        </div>
    );
};

export default TypingIndicator;
