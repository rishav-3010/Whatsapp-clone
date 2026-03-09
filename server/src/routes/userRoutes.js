/**
 * User Routes
 * 
 * GET /api/users/search - Search users
 * GET /api/users/me     - Get profile
 * PUT /api/users/me     - Update profile
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateHTTP } = require('../middleware/auth');

router.use(authenticateHTTP);

router.get('/search', userController.searchUsers);
router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);

module.exports = router;
