// routes/coachClientsRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, verifyCoach } = require("../middlewares/auth");
const { getCoachClients } = require("../handlers/clientCoach");

router.use(verifyToken, verifyCoach);

/**
 * GET /coach/clients
 * Optional query: ?q=...&limit=25
 * يرجّع clients متاع الكوتش (distinct) مع بحث اختياري.
 */
router.get("/", getCoachClients);

module.exports = router;
