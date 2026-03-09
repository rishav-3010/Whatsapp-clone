/**
 * Authentication Service
 * 
 * Handles all authentication business logic:
 * - User registration with password hashing
 * - Login validation
 * - JWT token generation (access + refresh)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserModel } = require('../models');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12; // bcrypt salt rounds — higher = more secure but slower

/**
 * Register a new user
 * @param {string} username 
 * @param {string} email 
 * @param {string} password - Plain text password
 * @returns {Object} User object + tokens
 */
const register = async (username, email, password) => {
    // Check if user already exists
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail.rows.length > 0) {
        throw new AppError('Email already registered', 409);
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername.rows.length > 0) {
        throw new AppError('Username already taken', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await UserModel.create(username, email, passwordHash);
    const user = result.rows[0];

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info(`New user registered: ${username}`);

    return { user, ...tokens };
};

/**
 * Login with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} User object + tokens
 */
const login = async (email, password) => {
    // Find user by email
    const result = await UserModel.findByEmail(email);
    if (result.rows.length === 0) {
        throw new AppError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Strip password hash from response
    const { password_hash, ...safeUser } = user;

    logger.info(`User logged in: ${user.username}`);

    return { user: safeUser, ...tokens };
};

/**
 * Refresh access token using a valid refresh token
 * @param {string} refreshToken 
 * @returns {Object} New tokens
 */
const refreshToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const result = await UserModel.findById(decoded.id);
        if (result.rows.length === 0) {
            throw new AppError('User not found', 404);
        }

        const user = result.rows[0];
        const tokens = generateTokens(user);

        return tokens;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Refresh token expired. Please login again.', 401);
        }
        throw new AppError('Invalid refresh token', 401);
    }
};

/**
 * Generate JWT access and refresh tokens
 * @param {Object} user - User object with id, username, email
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });

    return { accessToken, refreshToken };
};

module.exports = { register, login, refreshToken };
