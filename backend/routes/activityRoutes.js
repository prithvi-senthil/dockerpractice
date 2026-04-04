const express = require('express');
const router = express.Router();
const activitiesController = require('../controllers/activitiesController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/', auth, requireRole('faculty'), activitiesController.create);
router.post('/:id/generate-start-otp', auth, requireRole('faculty'), activitiesController.generateStartOTP);
router.post('/:id/generate-end-otp', auth, requireRole('faculty'), activitiesController.generateEndOTP);
router.get('/:id/students', auth, requireRole('faculty'), activitiesController.getEnrolledStudents);
router.get('/', auth, activitiesController.getAll);
router.get('/:id', auth, activitiesController.getById);

module.exports = router;