const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Examination is taken strictly by authenticated students
router.use(authenticateToken);
router.use(authorizeRoles('student'));

router.get('/instructions/:driveId', examController.getExamInstructions);
router.post('/start/:driveId', examController.startExam);
router.get('/attempt/:attemptId', examController.getActiveAttempt);
router.get('/review/:attemptId', examController.getExamReview);
router.post('/save-answers/:attemptId', examController.saveAnswers);
router.post('/submit/:attemptId', examController.submitExam);

module.exports = router;
