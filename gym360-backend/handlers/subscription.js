// handlers/subscription.js
const Subscription = require("../db/subscription");
const Client = require("../db/client"); // map userId -> clientId

// ---------- ADMIN CRUD ----------
exports.createSubscription = async (req, res) => {
  try {
    const subscription = new Subscription(req.body);
    const saved = await subscription.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate({ path: "clientId", select: "name userId" })
      .lean();
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate({ path: "clientId", select: "name userId" })
      .lean();
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const updated = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Subscription not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const deleted = await Subscription.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Subscription not found" });
    res.json({ message: "Subscription deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- CLIENT: /api/subscriptions/my ----------
exports.getMySubscriptions = async (req, res) => {
  try {
    // middleware puts { userId, role, ... } in req.user
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // map User._id -> Client._id
    const me = await Client.findOne({ userId }).select("_id").lean();
    if (!me) return res.json([]);

    // fetch this client's subscriptions
    const subs = await Subscription.find({ clientId: me._id })
      .sort({ startDate: -1, createdAt: -1 }) // adapt field names if different
      .lean();

    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
