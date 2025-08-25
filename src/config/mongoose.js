const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connect = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/email-analyzer';
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB connected');
};

module.exports = { connect };
