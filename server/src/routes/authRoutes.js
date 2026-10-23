const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// Public routes
router.post(
  '/register',
  validateBody({
    name: { required: true, minLength: 2 },
    email: { required: true, isEmail: true },
    password: { required: true, minLength: 6 },
  }),
  authController.registerStudent
);

router.post(
  '/login',
  validateBody({
    email: { required: true, isEmail: true },
    password: { required: true },
  }),
  authController.login
);

// Protected routes (all authenticated roles)
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
