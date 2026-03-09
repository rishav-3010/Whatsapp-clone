/**
 * User Search Component
 * Search for users to start a new conversation
 */

import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

const UserSearch = ({ onCreateChat, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                setResults(response.data.data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    return (
        <div className="user-search">
            <div className="user-search-header">
                <button className="icon-btn" onClick={onClose}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <h3>New Chat</h3>
            </div>
            <div className="user-search-input">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by username..."
                />
            </div>
            <div className="user-search-results">
                {loading && <div className="search-loading">Searching...</div>}
                {!loading && results.length === 0 && query.length >= 2 && (
                    <div className="search-empty">No users found</div>
                )}
                {results.map((user) => (
                    <div
                        key={user.id}
                        className="user-search-item"
                        onClick={() => onCreateChat(user.id)}
                    >
                        <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
                        <div className="user-search-info">
                            <span className="user-search-name">{user.username}</span>
                            <span className="user-search-email">{user.email}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserSearch;
