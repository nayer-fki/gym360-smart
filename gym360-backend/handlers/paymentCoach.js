// handlers/paymentCoach.js
// List payments visible to the logged-in coach.

const mongoose = require("mongoose");
const Payment = require("../db/payment");     // <-- adjust path if your model lives elsewhere
const Session = require("../db/session");     // used as a fallback to link payments by sessionId

const toId = (v) => { try { return new mongoose.Types.ObjectId(v); } catch { return null; } };

function toEndOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// GET /api/coach/payments/mine
// Query: q, status, from (YYYY-MM-DD), to (YYYY-MM-DD), limit, skip
async function getMyPayments(req, res) {
  try {
    const coachId = req.user?._id;
    if (!coachId) return res.status(401).json({ message: "No user" });

    const { q = "", status, from, to, limit = 200, skip = 0 } = req.query;
    const LIM = Math.min(parseInt(limit, 10) || 200, 500);
    const SKIP = parseInt(skip, 10) || 0;

    // Base filter
    const filter = {};

    // Scope to this coach.
    // Try multiple possible fields to be resilient to your schema:
    const coachScope = [
      { coachId: toId(coachId) },
      { coach: toId(coachId) },
      { receiverId: toId(coachId) },
      { payeeId: toId(coachId) },
    ];

    // Also include payments linked via a session that belongs to this coach.
    const sessionIds = await Session.find({ coachId: toId(coachId) })
      .select("_id")
      .lean()
      .then((rows) => rows.map((r) => r._id));
    if (sessionIds.length) coachScope.push({ sessionId: { $in: sessionIds } });

    filter.$or = coachScope;

    // Status filter (optional)
    if (status) filter.status = status;

    // Date range filter — try common date fields (date, createdAt, paidAt)
    if (from) {
      const d = new Date(from);
      (filter.$and ||= []).push({
        $or: [{ date: { $gte: d } }, { createdAt: { $gte: d } }, { paidAt: { $gte: d } }],
      });
    }
    if (to) {
      const d = toEndOfDay(to);
      (filter.$and ||= []).push({
        $or: [{ date: { $lte: d } }, { createdAt: { $lte: d } }, { paidAt: { $lte: d } }],
      });
    }

    // Free-text query on a few common fields
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      (filter.$and ||= []).push({
        $or: [
          { reference: rx },
          { method: rx },
          { "clientName": rx },
          { "client.email": rx },
          { "client.username": rx },
          { "meta.description": rx },   // optional if you store meta
          { clientId: toId(q) },        // allow ID paste
          { sessionId: toId(q) },
        ],
      });
    }

    const rows = await Payment.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(SKIP)
      .limit(LIM)
      .lean();

    // Return raw documents; the frontend service normalizes fields.
    return res.json(rows);
  } catch (e) {
    console.error("getMyPayments error", e);
    return res.status(500).json({ message: "Failed to load payments" });
  }
}

module.exports = { getMyPayments };
