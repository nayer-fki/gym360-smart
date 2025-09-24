// routes/subscriptionClientRoutes.js
const express = require("express");
const router = express.Router();
const subscription = require("../handlers/subscription");
const { verifyClient } = require("../middlewares/auth");

// GET /api/subscriptions/my -> authenticated client's subscriptions
router.get("/my", verifyClient, subscription.getMySubscriptions);

module.exports = router;
