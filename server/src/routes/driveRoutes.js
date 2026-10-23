const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/', driveController.getDrives);
router.get('/:id', driveController.getDriveById);
router.get('/:id/students', driveController.getDriveRegisteredStudents);

router.post(
  '/',
  validateBody({
    name: { required: true, minLength: 3 },
    jobTitle: { required: true, minLength: 2 },
    startDate: { required: true },
    endDate: { required: true },
  }),
  driveController.createDrive
);

router.put('/:id', driveController.updateDrive);
router.patch('/:id/publish-key', driveController.toggleExamKeyPublish);
router.post('/:id/regenerate-code', driveController.regenerateDriveCode);

module.exports = router;
