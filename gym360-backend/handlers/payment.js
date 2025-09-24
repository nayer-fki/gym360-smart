// handlers/payment.js
const Payment = require("../db/payment");
const Client = require("../db/client"); // needed to map userId -> clientId

// ---------------- ADMIN CRUD ----------------
exports.createPayment = async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const saved = await payment.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    // Populate for admin to see linked docs
    const payments = await Payment.find()
      .populate({ path: "clientId", select: "name userId" })
      .populate({ path: "subscriptionId", select: "name type price duration" })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({ path: "clientId", select: "name userId" })
      .populate({ path: "subscriptionId", select: "name type price duration" })
      .lean();

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate({ path: "clientId", select: "name userId" })
      .populate({ path: "subscriptionId", select: "name type price duration" })
      .lean();

    if (!updated) return res.status(404).json({ message: "Payment not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const deleted = await Payment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------- CLIENT: /api/payments/my ----------------
// Returns payments for the authenticated client only
exports.getMyPayments = async (req, res) => {
  try {
    // Middleware puts { userId, role, ... } in req.user
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Map User._id -> Client._id (Payment stores clientId = Client._id)
    const me = await Client.findOne({ userId }).select("_id").lean();
    if (!me) return res.json([]); // user has no Client profile yet

    // Fetch payments for this client, populate subscription details
    const payments = await Payment.find({ clientId: me._id })
      .populate({ path: "subscriptionId", select: "name type price duration" })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
