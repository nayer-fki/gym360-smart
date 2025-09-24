const Session = require('../db/session');
const Client = require('../db/client');
const Coach = require('../db/coach');

// Shared deep populate configuration
// -> populate coachId and clientIds, and also resolve userId (name, email)
const deepPopulate = [
  {
    path: 'coachId',
    select: 'name userId',
    populate: { path: 'userId', select: 'name email' },
  },
  {
    path: 'clientIds',
    select: 'name userId',
    populate: { path: 'userId', select: 'name email' },
  },
];

// ======================= CRUD for Admin =======================

// Create a new session
exports.createSession = async (req, res) => {
  try {
    const session = await Session.create(req.body);
    const populated = await Session.findById(session._id).populate(deepPopulate).lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all sessions (with optional filters)
exports.getAllSessions = async (req, res) => {
  try {
    const { q = '', coachId, clientId, type, status, from, to } = req.query;

    const criteria = {};
    if (coachId) criteria.coachId = coachId;
    if (clientId) criteria.clientIds = clientId;
    if (type) criteria.type = type;
    if (status) criteria.status = status;

    // Add date range if provided
    if (from || to) {
      criteria.date = {};
      if (from) criteria.date.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setDate(d.getDate() + 1); // include full end day
        criteria.date.$lt = d;
      }
    }

    let sessions = await Session.find(criteria)
      .sort({ date: -1, time: -1 })
      .populate(deepPopulate)
      .lean();

    // Optional search by name, type, or status
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      sessions = sessions.filter((s) => {
        const haystack = [
          s?.coachId?.userId?.name,
          s?.coachId?.name,
          ...(s?.clientIds || []).map((c) => c?.userId?.name || c?.name),
          s?.type,
          s?.status,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get one session by ID
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate(deepPopulate).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update session by ID
exports.updateSession = async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, req.body);
    const updated = await Session.findById(req.params.id).populate(deepPopulate).lean();
    if (!updated) return res.status(404).json({ message: 'Session not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete session
exports.deleteSession = async (req, res) => {
  try {
    const deleted = await Session.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================= Client Routes =======================

// Get sessions for the logged-in client
exports.getMySessions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const me = await Client.findOne({ userId }).select('_id').lean();
    if (!me) return res.json([]);

    const { q = '', type, status, from, to } = req.query;

    const criteria = { clientIds: me._id };
    if (type) criteria.type = type;
    if (status) criteria.status = status;

    // Add date filter
    if (from || to) {
      criteria.date = {};
      if (from) criteria.date.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setDate(d.getDate() + 1);
        criteria.date.$lt = d;
      }
    }

    let sessions = await Session.find(criteria).sort({ date: -1, time: -1 }).populate(deepPopulate).lean();

    // Optional text search
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      sessions = sessions.filter((s) => {
        const haystack = [
          s?.coachId?.userId?.name,
          s?.coachId?.name,
          ...(s?.clientIds || []).map((c) => c?.userId?.name || c?.name),
          s?.type,
          s?.status,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================= Coach Routes =======================

// Get sessions for the logged-in coach
exports.getMyCoachSessions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const me = await Coach.findOne({ userId }).select('_id').lean();
    if (!me) return res.json([]);

    const { q = '', type, status, from, to } = req.query;
    const criteria = { coachId: me._id };
    if (type) criteria.type = type;
    if (status) criteria.status = status;

    // Date filter
    if (from || to) {
      criteria.date = {};
      if (from) criteria.date.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setDate(d.getDate() + 1);
        criteria.date.$lt = d;
      }
    }

    let sessions = await Session.find(criteria).sort({ date: -1, time: -1 }).populate(deepPopulate).lean();

    // Optional search
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      sessions = sessions.filter((s) => {
        const haystack = [
          s?.coachId?.userId?.name,
          s?.coachId?.name,
          ...(s?.clientIds || []).map((c) => c?.userId?.name || c?.name),
          s?.type,
          s?.status,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Coach creates a session for themselves
exports.createSessionByCoach = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const coach = await Coach.findOne({ userId }).select('_id').lean();
    if (!coach) return res.status(403).json({ message: 'Coach profile not found' });

    const payload = { ...req.body, coachId: coach._id }; // force ownership
    const created = await Session.create(payload);
    const populated = await Session.findById(created._id).populate(deepPopulate).lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Coach updates only their own session
exports.updateSessionByCoach = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const coach = await Coach.findOne({ userId }).select('_id').lean();
    if (!coach) return res.status(403).json({ message: 'Coach profile not found' });

    const session = await Session.findById(req.params.id).select('coachId').lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.coachId) !== String(coach._id)) {
      return res.status(403).json({ message: 'Not your session' });
    }

    // Prevent changing coachId
    const { coachId, ...rest } = req.body || {};
    await Session.findByIdAndUpdate(req.params.id, rest);
    const populated = await Session.findById(req.params.id).populate(deepPopulate).lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Coach deletes only their own session
exports.deleteSessionByCoach = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const coach = await Coach.findOne({ userId }).select('_id').lean();
    if (!coach) return res.status(403).json({ message: 'Coach profile not found' });

    const session = await Session.findById(req.params.id).select('coachId').lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.coachId) !== String(coach._id)) {
      return res.status(403).json({ message: 'Not your session' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
