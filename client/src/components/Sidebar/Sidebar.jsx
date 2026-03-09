/**
 * Sidebar Component
 * 
 * Shows:
 * - Current user info
 * - User search
 * - Chat room list with last message preview
 * - Online indicators
 */

import { useState } from 'react';
import ChatList from './ChatList';
import UserSearch from './UserSearch';

const Sidebar = ({ rooms, activeRoom, onSelectRoom, onlineUsers, loadingRooms, onCreateChat, user, onLogout }) => {
    const [searchMode, setSearchMode] = useState(false);

    return (
        <div className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-user">
                    <div className="avatar">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="sidebar-username">{user?.username}</span>
                </div>
                <div className="sidebar-actions">
                    <button
                        className="icon-btn"
                        onClick={() => setSearchMode(!searchMode)}
                        title="New chat"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={onLogout} title="Logout">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search / Chat List */}
            {searchMode ? (
                <UserSearch
                    onCreateChat={(userId) => {
                        onCreateChat(userId);
                        setSearchMode(false);
                    }}
                    onClose={() => setSearchMode(false)}
                />
            ) : (
                <>
                    <div className="sidebar-search">
                        <div className="search-input-wrapper">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.5">
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search or start new chat"
                                onClick={() => setSearchMode(true)}
                                readOnly
                            />
                        </div>
                    </div>
                    <ChatList
                        rooms={rooms}
                        activeRoom={activeRoom}
                        onSelectRoom={onSelectRoom}
                        onlineUsers={onlineUsers}
                        loading={loadingRooms}
                    />
                </>
            )}
        </div>
    );
};

export default Sidebar;
