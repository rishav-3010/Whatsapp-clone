/**
 * Auth Controller
 * 
 * REST API endpoints for authentication:
 * POST /api/auth/register - Create new account
 * POST /api/auth/login - Login with credentials
 * POST /api/auth/refresh - Refresh access token
 */

const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { username, email, password }
 */
const register = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const result = await authService.register(username, email, password);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result,
    });
});

/**
 * Login with credentials
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
        success: true,
        message: 'Login successful',
        data: result,
    });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    res.json({
        success: true,
        message: 'Token refreshed',
        data: tokens,
    });
});

module.exports = { register, login, refresh };
