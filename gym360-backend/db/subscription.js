const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, enum: ['Mensuel', 'Annuel'], required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Expired'], default: 'Active' }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
