const mongoose = require('mongoose');
const { Schema } = mongoose;

const clientSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  fitnessGoal: String
});

module.exports = mongoose.model('Client', clientSchema);
