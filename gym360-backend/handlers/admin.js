const path = require('path');
const User = require('../db/user');
const Client = require('../db/client');
const Coach = require('../db/coach');
const Subscription = require('../db/subscription');
const Payment = require('../db/payment');
const Feedback = require('../db/feedback');
const Session = require('../db/session');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('clientId');
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body || {};

    let incomingImage = (req.body && req.body.image) || undefined;
    if (req.file) {
      incomingImage = `/uploads/${req.file.filename}`;
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const oldRole = user.role;

    if (typeof name === 'string')  user.name  = name.trim();
    if (typeof email === 'string') user.email = email.trim();
    if (typeof role === 'string')  user.role  = role.trim().toLowerCase();
    if (typeof incomingImage === 'string' && incomingImage !== '') {
      user.image = incomingImage;
    }

    await user.save();

    if (role && role.trim().toLowerCase() !== oldRole) {
      const newRole = role.trim().toLowerCase();
      if (newRole === 'client') {
        await Client.findOneAndUpdate(
          { userId: id },
          { $setOnInsert: { userId: id } },
          { upsert: true, new: true }
        );
        await Coach.deleteOne({ userId: id });
      } else if (newRole === 'coach') {
        await Coach.findOneAndUpdate(
          { userId: id },
          { $setOnInsert: { userId: id } },
          { upsert: true, new: true }
        );
        await Client.deleteOne({ userId: id });
      } else if (newRole === 'admin') {
        await Client.deleteOne({ userId: id });
        await Coach.deleteOne({ userId: id });
      }
    }

    const sanitized = await User.findById(id).select('-password');
    return res.json({ message: 'Update success', user: sanitized });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Update failed' });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('clientId subscriptionId');
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('clientId coachId sessionId');
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find().populate('coachId clientIds');
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  getAllSubscriptions,
  getAllPayments,
  getAllFeedbacks,
  getAllSessions,
  updateUser,
};
