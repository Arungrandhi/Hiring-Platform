const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/', questionPaperController.getQuestionPapers);
router.get('/:id', questionPaperController.getQuestionPaperById);

router.post(
  '/',
  validateBody({
    title: { required: true, minLength: 3 },
    subject: { required: true },
    duration: { required: true, isNumber: true },
  }),
  questionPaperController.createQuestionPaper
);

router.put('/:id', questionPaperController.updateQuestionPaper);
router.patch('/:id/publish', questionPaperController.publishQuestionPaper);
router.patch('/:id/archive', questionPaperController.archiveQuestionPaper);

module.exports = router;
