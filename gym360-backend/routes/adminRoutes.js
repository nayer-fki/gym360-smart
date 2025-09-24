const express = require('express');
const router = express.Router();
const adminHandler = require('../handlers/admin');
const upload = require('../middlewares/upload');
const { verifyAdmin } = require('../middlewares/auth');

router.get('/users', verifyAdmin, adminHandler.getAllUsers);
router.delete('/users/:id', verifyAdmin, adminHandler.deleteUser);
router.put('/users/:id', verifyAdmin, upload.single('image'), adminHandler.updateUser);

router.get('/subscriptions', verifyAdmin, adminHandler.getAllSubscriptions);
router.get('/payments', verifyAdmin, adminHandler.getAllPayments);
router.get('/feedbacks', verifyAdmin, adminHandler.getAllFeedbacks);
router.get('/sessions', verifyAdmin, adminHandler.getAllSessions);

module.exports = router;
