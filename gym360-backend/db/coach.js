const mongoose = require('mongoose');
const { Schema } = mongoose;

const coachSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  speciality: { type: String },
  assignedClients: [{ type: Schema.Types.ObjectId, ref: 'Client' }]
});

module.exports = mongoose.model('Coach', coachSchema);
