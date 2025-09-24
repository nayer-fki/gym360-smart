const Coach = require('../db/coach');

/**
 * Create Coach
 * Create a new coach document in the database
 */
exports.createCoach = async (req, res) => {
  try {
    const coach = new Coach(req.body);
    const savedCoach = await coach.save();
    res.status(201).json(savedCoach);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get All Coaches
 * Retrieve all coaches with populated user (excluding password and __v) and assigned clients
 */
exports.getAllCoaches = async (req, res) => {
  try {
    const coaches = await Coach.find()
      .populate('userId', '-password -__v')
      .populate('assignedClients');
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Coach by ID
 * Retrieve a single coach by their coachId
 */
exports.getCoachById = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id)
      .populate('userId', '-password -__v')
      .populate('assignedClients');

    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    res.json(coach);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update Coach (SMART: accepts coachId or userId)
 * First tries updating by _id, then falls back to userId
 */
exports.updateCoach = async (req, res) => {
  try {
    const update = req.body;

    // Try updating by coachId
    let updatedCoach = await Coach.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    // If not found, try by userId
    if (!updatedCoach) {
      updatedCoach = await Coach.findOneAndUpdate(
        { userId: req.params.id },
        update,
        { new: true, runValidators: true }
      );
    }

    if (!updatedCoach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    res.json(updatedCoach);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Coach (SMART: accepts coachId or userId)
 * First tries deleting by _id, then falls back to userId
 */
exports.deleteCoach = async (req, res) => {
  try {
    let deletedCoach = await Coach.findByIdAndDelete(req.params.id);

    if (!deletedCoach) {
      deletedCoach = await Coach.findOneAndDelete({ userId: req.params.id });
    }

    if (!deletedCoach) {
      return res.status(404).json({ message: 'Coach not found' });
    }

    res.json({ message: 'Coach deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
