const mongoose = require('mongoose');
const { Schema } = mongoose;

const mlRecommendationSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  recommendedSessions: [String],
  churnRiskScore: { type: Number, min: 0, max: 1 }
});

module.exports = mongoose.model('MLRecommendation', mlRecommendationSchema);
