// handlers/client.js
const Client = require("../db/client");
const mongoose = require("mongoose");

/**
 * Create a new client document.
 */
exports.createClient = async (req, res) => {
  try {
    const client = new Client(req.body);
    const savedClient = await client.save();
    return res.status(201).json(savedClient);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get all clients with populated refs (admin only).
 */
exports.getAllClients = async (_req, res) => {
  try {
    const clients = await Client.find()
      .populate("userId")
      .populate("subscriptionId");
    return res.json(clients);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get a single client by clientId.
 */
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("userId")
      .populate("subscriptionId");

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get a single client by userId.
 * Returns 404 if no client doc is found for the given userId.
 */
exports.getClientByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const client = await Client.findOne({ userId })
      .populate("userId")
      .populate("subscriptionId");

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update client by clientId; if not found, fallback to userId.
 */
exports.updateClient = async (req, res) => {
  try {
    const update = req.body;

    // Try by client _id first
    let updatedClient = await Client.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    // Fallback to userId if not found
    if (!updatedClient) {
      updatedClient = await Client.findOneAndUpdate(
        { userId: req.params.id },
        update,
        { new: true, runValidators: true }
      );
    }

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(updatedClient);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete client by clientId; if not found, fallback to userId.
 */
exports.deleteClient = async (req, res) => {
  try {
    let deletedClient = await Client.findByIdAndDelete(req.params.id);

    if (!deletedClient) {
      deletedClient = await Client.findOneAndDelete({ userId: req.params.id });
    }

    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json({ message: "Client deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update client by userId (upsert if missing).
 */
exports.updateClientByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const update = req.body || {};

    const updated = await Client.findOneAndUpdate(
      { userId },
      {
        $set: update,
        $setOnInsert: { userId },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )
      .populate("userId")
      .populate("subscriptionId");

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
