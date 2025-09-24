// routes/paymentClientRoutes.js
const express = require('express');
const router = express.Router();
const payment = require('../handlers/payment');
const { verifyClient } = require('../middlewares/auth');

// GET /api/payments/my  -> list current client's payments
router.get('/my', verifyClient, payment.getMyPayments);

module.exports = router;
