// db/feedback.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    clientId:  { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    coachId:   { type: Schema.Types.ObjectId, ref: 'Coach',  required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session',required: true },
    rating:    { type: Number, min: 1, max: 5, required: true },
    comment:   { type: String, default: "" },
  },
  { timestamps: true }
);

// Optional: prevent duplicate feedback for the same client & session
feedbackSchema.index({ clientId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
