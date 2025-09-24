// Handlers for the approval workflow and coach notifications.

const mongoose = require("mongoose");
const SessionRequest = require("../db/sessionRequest");
const Session = require("../db/session");
const Client = require("../db/client");

const toId = (v) => { try { return new mongoose.Types.ObjectId(v); } catch { return null; } };

// ---------------- COACH SIDE ----------------

// POST /api/requests  (coach creates a new request)
async function createRequest(req, res) {
  try {
    const coachId = req.user?._id;
    const { clientIds = [], date, time, type = "Cardio", note = "" } = req.body;

    if (!coachId) return res.status(401).json({ message: "No user" });
    if (!date || !time) return res.status(400).json({ message: "date & time are required" });
    if (!clientIds?.length) return res.status(400).json({ message: "At least one client required" });

    // Verify clients exist
    const ids = clientIds.map(toId).filter(Boolean);
    const count = await Client.countDocuments({ _id: { $in: ids } });
    if (count !== ids.length) return res.status(400).json({ message: "Invalid clientIds" });

    // Optional conflict check (still allow; admin will decide)
    const conflict = await Session.findOne({
      coachId: toId(coachId),
      date: new Date(date),
      time,
    }).lean();
    if (conflict) {
      // no-op (warning can be surfaced on admin UI)
    }

    const doc = await SessionRequest.create({
      coachId: toId(coachId),
      clientIds: ids,
      date: new Date(date),
      time,
      type,
      note,
      status: "Pending",
    });

    return res.status(201).json(doc);
  } catch (e) {
    console.error("createRequest error", e);
    return res.status(500).json({ message: "Failed to create request" });
  }
}

// GET /api/requests/mine  (coach lists own requests)
async function listMyRequests(req, res) {
  try {
    const coachId = req.user?._id;
    const { status, from, to } = req.query;

    const filter = { coachId: toId(coachId) };
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const rows = await SessionRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(rows);
  } catch (e) {
    console.error("listMyRequests error", e);
    return res.status(500).json({ message: "Failed to load requests" });
  }
}

// DELETE /api/requests/:id  (coach cancels if still pending)
async function cancelMyRequest(req, res) {
  try {
    const coachId = req.user?._id;
    const { id } = req.params;

    const doc = await SessionRequest.findOne({ _id: toId(id), coachId: toId(coachId) });
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.status !== "Pending") return res.status(400).json({ message: "Only pending can be canceled" });

    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    console.error("cancelMyRequest error", e);
    return res.status(500).json({ message: "Failed to cancel request" });
  }
}

// ---------------- ADMIN SIDE ----------------

// GET /api/admin/requests  (admin lists all requests with filters)
async function adminListRequests(req, res) {
  try {
    const { status, coachId, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (coachId) filter.coachId = toId(coachId);
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const rows = await SessionRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(rows);
  } catch (e) {
    console.error("adminListRequests error", e);
    return res.status(500).json({ message: "Failed to load requests" });
  }
}

// POST /api/admin/requests/:id/approve  (admin approves and creates a session)
async function adminApprove(req, res) {
  try {
    const adminId = req.user?._id;
    const { id } = req.params;
    const { decisionNote = "" } = req.body;

    const doc = await SessionRequest.findById(toId(id));
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.status !== "Pending") return res.status(400).json({ message: "Already decided" });

    // Create the real session
    const session = await Session.create({
      coachId: doc.coachId,
      clientIds: doc.clientIds,
      date: doc.date,
      time: doc.time,
      type: doc.type,
      status: "Scheduled",
    });

    // Update request with approval info and mark decision time for notifications
    doc.status = "Approved";
    doc.decidedBy = toId(adminId);
    doc.decidedAt = new Date();
    doc.decisionNote = decisionNote;
    doc.sessionId = session._id;
    doc.statusChangedAt = new Date(); // <-- important for notifications
    await doc.save();

    return res.json({ ok: true, session });
  } catch (e) {
    console.error("adminApprove error", e);
    return res.status(500).json({ message: "Approve failed" });
  }
}

// POST /api/admin/requests/:id/reject  (admin rejects)
async function adminReject(req, res) {
  try {
    const adminId = req.user?._id;
    const { id } = req.params;
    const { decisionNote = "" } = req.body;

    const doc = await SessionRequest.findById(toId(id));
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.status !== "Pending") return res.status(400).json({ message: "Already decided" });

    doc.status = "Rejected";
    doc.decidedBy = toId(adminId);
    doc.decidedAt = new Date();
    doc.decisionNote = decisionNote;
    doc.statusChangedAt = new Date(); // <-- important for notifications
    await doc.save();

    return res.json({ ok: true });
  } catch (e) {
    console.error("adminReject error", e);
    return res.status(500).json({ message: "Reject failed" });
  }
}

// ---------------- COACH NOTIFICATIONS ----------------

// GET /api/requests/notifications  (coach: list unread and recent)
async function listCoachNotifications(req, res) {
  try {
    const coachId = req.user?._id;
    const { limit = 10, unreadOnly = "true" } = req.query;
    const LIM = Math.min(parseInt(limit, 10) || 10, 50);

    const base = {
      coachId: toId(coachId),
      status: { $in: ["Approved", "Rejected"] },
    };

    const filter = unreadOnly === "true"
      ? {
          ...base,
          $expr: {
            $or: [
              { $eq: ["$coachSeenAt", null] },
              { $lt: ["$coachSeenAt", "$statusChangedAt"] },
            ],
          },
        }
      : base;

    const items = await SessionRequest.find(filter)
      .sort({ statusChangedAt: -1 })
      .limit(LIM)
      .lean();

    const count = await SessionRequest.countDocuments({
      ...base,
      $expr: {
        $or: [
          { $eq: ["$coachSeenAt", null] },
          { $lt: ["$coachSeenAt", "$statusChangedAt"] },
        ],
      },
    });

    return res.json({ count, items });
  } catch (e) {
    console.error("listCoachNotifications error", e);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
}

// POST /api/requests/notifications/read  (coach: mark all unread as read)
async function markCoachNotificationsRead(req, res) {
  try {
    const coachId = req.user?._id;
    const now = new Date();
    await SessionRequest.updateMany(
      {
        coachId: toId(coachId),
        status: { $in: ["Approved", "Rejected"] },
        $expr: {
          $or: [
            { $eq: ["$coachSeenAt", null] },
            { $lt: ["$coachSeenAt", "$statusChangedAt"] },
          ],
        },
      },
      { $set: { coachSeenAt: now } }
    );
    return res.json({ ok: true, seenAt: now });
  } catch (e) {
    console.error("markCoachNotificationsRead error", e);
    return res.status(500).json({ message: "Failed to mark as read" });
  }
}

module.exports = {
  createRequest,
  listMyRequests,
  cancelMyRequest,
  adminListRequests,
  adminApprove,
  adminReject,
  listCoachNotifications,       // <-- make sure these are exported
  markCoachNotificationsRead,   // <-- make sure these are exported
};
