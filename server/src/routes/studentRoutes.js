const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRoles('student'));

router.get('/dashboard', studentController.getStudentDashboard);
router.get('/history', studentController.getStudentExamHistory);
router.get('/progress/:driveId', studentController.getStudentCandidateProgress);

module.exports = router;
