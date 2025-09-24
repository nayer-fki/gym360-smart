const express = require("express");
const router = express.Router();
const { verifyToken, verifyCoach, verifyAdmin } = require("../middlewares/auth");
const h = require("../handlers/sessionRequest");

// ---------------- COACH ENDPOINTS ----------------

// Create a new session request (coach only)
router.post("/requests", verifyToken, verifyCoach, h.createRequest);

// List session requests created by the logged-in coach
router.get("/requests/mine", verifyToken, verifyCoach, h.listMyRequests);

// Cancel a pending request (coach only, must be owner)
router.delete("/requests/:id", verifyToken, verifyCoach, h.cancelMyRequest);

// Coach notifications: list unread (and recent) decisions
router.get(
  "/requests/notifications",
  verifyToken,
  verifyCoach,
  h.listCoachNotifications
);

// Coach notifications: mark all unread as read
router.post(
  "/requests/notifications/read",
  verifyToken,
  verifyCoach,
  h.markCoachNotificationsRead
);

// ---------------- ADMIN ENDPOINTS ----------------

// List all session requests (admin only, with filters)
router.get("/admin/requests", verifyToken, verifyAdmin, h.adminListRequests);

// Approve a pending request (creates a real session)
router.post("/admin/requests/:id/approve", verifyToken, verifyAdmin, h.adminApprove);

// Reject a pending request
router.post("/admin/requests/:id/reject", verifyToken, verifyAdmin, h.adminReject);

module.exports = router;
