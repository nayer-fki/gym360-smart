// routes/paymentCoachRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, verifyCoach } = require("../middlewares/auth");
const h = require("../handlers/paymentCoach");

router.use(verifyToken, verifyCoach);

// GET /api/coach/payments/mine
router.get("/mine", h.getMyPayments);

module.exports = router;
