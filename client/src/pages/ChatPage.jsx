/**
 * Chat Page - Main application page
 * Combines Sidebar and ChatWindow
 */

import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import { useSocket } from '../context/SocketContext';
import useChat from '../hooks/useChat';

const ChatPage = () => {
    const { user, logout } = useAuth();
    const { isConnected } = useSocket();
    const {
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
    } = useChat();

    return (
        <div className="chat-page">
            <Sidebar
                rooms={rooms}
                activeRoom={activeRoom}
                onSelectRoom={selectRoom}
                onlineUsers={onlineUsers}
                loadingRooms={loadingRooms}
                onCreateChat={async (userId) => {
                    const room = await createPrivateChat(userId);
                    if (room) selectRoom(room);
                }}
                user={user}
                onLogout={logout}
            />
            <ChatWindow
                activeRoom={activeRoom}
                messages={messages}
                typingUsers={typingUsers}
                onSendMessage={sendMessage}
                onTyping={handleTyping}
                loadMoreMessages={loadMoreMessages}
                loadingMessages={loadingMessages}
                pagination={pagination}
                currentUser={user}
                onlineUsers={onlineUsers}
                isConnected={isConnected}
            />
        </div>
    );
};

export default ChatPage;
