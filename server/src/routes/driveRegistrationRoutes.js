const express = require('express');
const router = express.Router();
const driveRegistrationController = require('../controllers/driveRegistrationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// Only student can join and view registered drives
router.use(authenticateToken);
router.use(authorizeRoles('student'));

router.post(
  '/join',
  validateBody({
    driveCode: { required: true, minLength: 4 },
  }),
  driveRegistrationController.joinDriveByCode
);

router.get('/my-drives', driveRegistrationController.getMyJoinedDrives);

module.exports = router;
