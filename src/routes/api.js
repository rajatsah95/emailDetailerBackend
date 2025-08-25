const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');

// returns the last N processed email logs
router.get('/emails', async (req, res) => {
  const limit = parseInt(req.query.limit || '20', 10);
  const items = await EmailLog.find().sort({ processedAt: -1 }).limit(limit).lean();
  res.json(items);
});

// returns counts / stats
router.get('/stats', async (req, res) => {
  const total = await EmailLog.countDocuments();
  const byEsp = await EmailLog.aggregate([
    { $group: { _id: '$esp', count: { $sum: 1 } } }
  ]);
  res.json({ total, byEsp });
});

module.exports = router;
