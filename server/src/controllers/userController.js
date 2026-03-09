/**
 * User Controller
 * 
 * REST API endpoints for user operations:
 * GET /api/users/search?q=<query> - Search users by username
 * GET /api/users/me - Get current user profile
 * PUT /api/users/me - Update profile
 */

const { UserModel } = require('../models');
const { asyncHandler, AppError, sanitizeUser } = require('../utils/helpers');

/**
 * Search users by username
 * GET /api/users/search?q=john
 */
const searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
        return res.json({ success: true, data: [] });
    }

    const result = await UserModel.searchByUsername(q.trim());

    // Filter out the requesting user from results
    const users = result.rows.filter((user) => user.id !== req.user.id);

    res.json({
        success: true,
        data: users,
    });
});

/**
 * Get current authenticated user's profile
 * GET /api/users/me
 */
const getProfile = asyncHandler(async (req, res) => {
    const result = await UserModel.findById(req.user.id);

    if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
    }

    res.json({
        success: true,
        data: sanitizeUser(result.rows[0]),
    });
});

/**
 * Update current user's profile
 * PUT /api/users/me
 * Body: { username?, avatar_url? }
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { username, avatar_url } = req.body;

    const result = await UserModel.updateProfile(req.user.id, {
        username,
        avatar_url,
    });

    res.json({
        success: true,
        data: result.rows[0],
    });
});

module.exports = { searchUsers, getProfile, updateProfile };
