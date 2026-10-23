const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Results inspection is restricted to Admin and Super Admin
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/drive/:driveId', resultController.getDriveResults);
router.get('/attempt/:attemptId', resultController.getAttemptDetail);

module.exports = router;
