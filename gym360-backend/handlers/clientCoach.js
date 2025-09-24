const mongoose = require("mongoose");
const Session = require("../db/session");
const Client  = require("../db/client");

const toId = (v) => { try { return new mongoose.Types.ObjectId(v); } catch { return null; } };

// Helper: text to regex (case-insensitive, escaped)
const rx = (s) => new RegExp(String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

/**
 * GET /api/coach/clients?q=&limit=
 * Returns clients reachable by this coach, with a sensible fallback order:
 *  1) Clients from the coach’s existing sessions (distinct)
 *  2) If none, clients assigned to this coach (Client.coachId == coach)
 *  3) If still none, returns top N clients (so the picker isn’t empty on day 0)
 * Always populates userId(name,email) and filters by q in-memory.
 */
async function getCoachClients(req, res) {
  try {
    const coachId = req.user?._id;
    if (!coachId) return res.status(401).json({ message: "No user in token" });

    const { q = "", limit = 25 } = req.query;
    const LIM = Math.min(parseInt(limit, 10) || 25, 100);
    const qrx = q ? rx(q) : null;

    // 1) Clients from the coach’s sessions
    const sessions = await Session.find({ coachId: toId(coachId) }).select("clientIds").lean();
    const fromSessions = new Set();
    for (const s of sessions) for (const cid of (s.clientIds || [])) fromSessions.add(String(cid));

    let clientIds = Array.from(fromSessions).map(toId).filter(Boolean);
    let baseQuery;
    if (clientIds.length) {
      baseQuery = { _id: { $in: clientIds } };
    } else {
      // 2) Fallback: clients assigned to this coach (if you have that field)
      const assigned = await Client.find({ coachId: toId(coachId) }).select("_id").lean();
      if (assigned.length) {
        baseQuery = { _id: { $in: assigned.map((c) => c._id) } };
      } else {
        // 3) Final fallback: any clients (picker shouldn't be empty on day 0)
        baseQuery = {};
      }
    }

    // Pull a bit more than LIM to allow filtering by q afterwards
    let docs = await Client.find(baseQuery)
      .limit(LIM * 4)
      .populate("userId", "name email")
      .lean();

    if (qrx) {
      docs = docs.filter((c) => {
        const fields = [
          c?.userId?.name,
          c?.userId?.email,
          c?.name,
          c?.fullName,
          c?.username,
          c?.email,
        ].filter(Boolean);
        return fields.some((f) => qrx.test(String(f)));
      });
    }

    // Final limit
    docs = docs.slice(0, LIM);

    // Add a displayName for convenience (keeps compatibility)
    const withDisplay = docs.map((c) => ({
      ...c,
      displayName: c?.userId?.name || c?.name || c?.fullName || c?.username || c?.email || String(c._id),
    }));

    return res.json(withDisplay);
  } catch (e) {
    console.error("getCoachClients error", e);
    return res.status(500).json({ message: "Failed to load coach clients" });
  }
}

module.exports = { getCoachClients };
