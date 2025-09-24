const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
});

module.exports = mongoose.model('Payment', paymentSchema);
