const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// Protect all routes in this router: only superadmin
router.use(authenticateToken);
router.use(authorizeRoles('superadmin'));

router.get('/stats', superadminController.getDashboardStats);
router.get('/admins', superadminController.getAdmins);
router.get('/admins/:id', superadminController.getAdminDetails);

router.post(
  '/admins',
  validateBody({
    name: { required: true, minLength: 2 },
    email: { required: true, isEmail: true },
    password: { required: true, minLength: 6 },
  }),
  superadminController.createAdmin
);

router.put('/admins/:id', superadminController.updateAdmin);
router.put('/admins/:id/reset-password', superadminController.resetAdminPassword);

router.get('/activities', superadminController.getActivityLogs);

module.exports = router;
