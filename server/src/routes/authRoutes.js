/**
 * Auth Routes
 * 
 * POST /api/auth/register - Create account
 * POST /api/auth/login    - Login
 * POST /api/auth/refresh  - Refresh token
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRequired, validateEmail, validatePassword } = require('../middleware/validate');

// Register - rate limited + validated
router.post(
    '/register',
    authLimiter,
    validateRequired(['username', 'email', 'password']),
    validateEmail,
    validatePassword,
    authController.register
);

// Login - rate limited + validated
router.post(
    '/login',
    authLimiter,
    validateRequired(['email', 'password']),
    authController.login
);

// Refresh token
router.post(
    '/refresh',
    validateRequired(['refreshToken']),
    authController.refresh
);

module.exports = router;
