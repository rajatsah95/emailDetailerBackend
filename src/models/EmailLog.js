const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  subject: String,
  from: String,
  to: String,
  date: Date,
  rawHeaders: Object,
  rawText: String,
  receivedChain: [String],
  esp: String,
  processedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailLog', EmailLogSchema);
