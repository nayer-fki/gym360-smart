const mongoose = require('mongoose');
const { Schema } = mongoose;

const biExportSchema = new Schema({
  exportType: { type: String, enum: ['Sessions', 'Payments', 'Subscriptions'], required: true },
  generatedAt: { type: Date, default: Date.now },
  filePath: { type: String, required: true }
});

module.exports = mongoose.model('BIExportData', biExportSchema);
