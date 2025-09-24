// routes/paymentRoutes.js
// Admin-only payment routes

const express = require('express');
const router = express.Router();
const payment = require('../handlers/payment');
const { verifyAdmin } = require('../middlewares/auth');

router.post('/', verifyAdmin, payment.createPayment);
router.get('/', verifyAdmin, payment.getAllPayments);
router.get('/:id', verifyAdmin, payment.getPaymentById);
router.put('/:id', verifyAdmin, payment.updatePayment);
router.delete('/:id', verifyAdmin, payment.deletePayment);

module.exports = router;
