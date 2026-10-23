const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

// Subject management is allowed for Admin and SuperAdmin
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/', subjectController.getSubjects);

router.post(
  '/',
  validateBody({
    name: { required: true, minLength: 2 },
  }),
  subjectController.createSubject
);

router.put('/:id', subjectController.updateSubject);
router.patch('/:id/toggle-status', subjectController.toggleSubjectStatus);

module.exports = router;
