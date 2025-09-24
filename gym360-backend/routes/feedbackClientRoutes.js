// routes/feedbackClientRoutes.js
const express = require('express');
const router = express.Router();
const feedback = require('../handlers/feedback');
const { verifyClient } = require('../middlewares/auth');

// Client creates feedback and lists own feedbacks
router.post('/', verifyClient, feedback.createMyFeedback);
router.get('/my', verifyClient, feedback.getMyFeedbacks);

module.exports = router;
