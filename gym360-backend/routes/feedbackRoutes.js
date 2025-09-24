const express = require('express');
const router = express.Router();
const feedback = require('../handlers/feedback');
const { verifyAdmin } = require('../middlewares/auth');

router.post('/', verifyAdmin, feedback.createFeedback);
router.get('/', verifyAdmin, feedback.getAllFeedbacks);
router.get('/:id', verifyAdmin, feedback.getFeedbackById);
router.put('/:id', verifyAdmin, feedback.updateFeedback);
router.delete('/:id', verifyAdmin, feedback.deleteFeedback);

module.exports = router;
