// handlers/feedback.js
// Feedback handlers with deep-populate so coach and client display names are available.

const Feedback = require('../db/feedback');
const Client = require('../db/client');
const Session = require('../db/session'); // used to derive coachId and validate membership

// ---------------- ADMIN CRUD ----------------
exports.createFeedback = async (req, res) => {
  try {
    const feedback = new Feedback(req.body);
    const saved = await feedback.save();
    res.status(201).json(saved);
  } catch (err) {
    // duplicate key (unique index on clientId+sessionId)
    if (err.code === 11000) {
      return res.status(409).json({ message: "Feedback already exists for this session." });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getAllFeedbacks = async (_req, res) => {
  try {
    const feedbacks = await Feedback.find()
      // Deep-populate clientId -> userId to access user display name
      .populate({
        path: 'clientId',
        select: 'name userId',
        populate: { path: 'userId', select: 'name email' },
      })
      // Deep-populate coachId -> userId to access coach display name
      .populate({
        path: 'coachId',
        select: 'name userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate({ path: 'sessionId', select: 'type date time' })
      .sort({ createdAt: -1 })
      .lean();

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate({
        path: 'clientId',
        select: 'name userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate({
        path: 'coachId',
        select: 'name userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate({ path: 'sessionId', select: 'type date time' })
      .lean();

    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Feedback not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- CLIENT ENDPOINTS ----------------

// GET /api/feedbacks/my  -> list current client's feedbacks
exports.getMyFeedbacks = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Map User -> Client to find the right clientId
    const me = await Client.findOne({ userId }).select('_id').lean();
    if (!me) return res.json([]);

    const rows = await Feedback.find({ clientId: me._id })
      // Deep-populate coach's user so UI can read coachId.userId.name
      .populate({
        path: 'coachId',
        select: 'name userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate({ path: 'sessionId', select: 'type date time' })
      .sort({ createdAt: -1 })
      .lean();

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/feedbacks  -> create feedback for current client
exports.createMyFeedback = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const me = await Client.findOne({ userId }).select('_id').lean();
    if (!me) return res.status(403).json({ message: 'No client profile found' });

    const { sessionId, rating, comment } = req.body;
    if (!sessionId || !rating) {
      return res.status(400).json({ message: 'sessionId and rating are required' });
    }

    // Validate session and ensure the client is a participant
    const sess = await Session.findById(sessionId).select('coachId clientIds').lean();
    if (!sess) return res.status(404).json({ message: 'Session not found' });

    const isMember = Array.isArray(sess.clientIds) &&
      sess.clientIds.some(id => String(id) === String(me._id));
    if (!isMember) return res.status(403).json({ message: 'You are not a participant in this session' });

    const doc = new Feedback({
      clientId: me._id,
      coachId: sess.coachId, // derive coach from session
      sessionId,
      rating,
      comment: comment || "",
    });

    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already submitted feedback for this session' });
    }
    res.status(500).json({ message: err.message });
  }
};
