const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/drive/:driveId', candidateController.getCandidatesByDrive);
router.get('/detail/:driveId/:studentId', candidateController.getCandidateProgressDetail);

router.post(
  '/shortlist',
  validateBody({
    driveId: { required: true },
    studentId: { required: true },
  }),
  candidateController.shortlistCandidate
);

router.put(
  '/update-stage',
  validateBody({
    driveId: { required: true },
    studentId: { required: true },
  }),
  candidateController.updateCandidateStage
);

router.post(
  '/bulk-advance',
  validateBody({
    driveId: { required: true },
  }),
  candidateController.bulkAdvanceCandidates
);


module.exports = router;
