const mongoose = require('mongoose');
const { Schema } = mongoose;

// Session schema: one coach, many clients
const sessionSchema = new Schema(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'Coach', required: true, index: true }, // linked coach
    clientIds: [{ type: Schema.Types.ObjectId, ref: 'Client', index: true }], // multiple clients
    date: { type: Date, required: true, index: true }, // session date
    time: { type: String, required: true }, // session time
    type: { type: String, enum: ['Cardio', 'Muscu', 'Yoga', 'Autre'], index: true }, // session type
    status: { type: String, enum: ['Scheduled', 'Done', 'Cancelled'], default: 'Scheduled', index: true }, // session status
  },
  { timestamps: true } // adds createdAt and updatedAt
);

module.exports = mongoose.model('Session', sessionSchema);
