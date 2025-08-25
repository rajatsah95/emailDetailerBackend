/**
 * Server entrypoint.
 * - connects to MongoDB
 * - generates a TEST_SUBJECT_TOKEN if not set
 * - starts IMAP watcher
 * - exposes simple API to read processed emails and show the test address + token
 */

const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const app = require('./app');
const { connect } = require('./config/mongoose');
const IMAPWatcher = require('./imapWatcher');

const PORT = process.env.PORT || 4000;

async function start() {
  await connect();

  // ensure we have a test token
  let token = process.env.TEST_SUBJECT_TOKEN;
  if (!token) {
    token = 'EMAIL-ANALYZER-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    process.env.TEST_SUBJECT_TOKEN = token;
    console.log('Generated TEST_SUBJECT_TOKEN:', token);
  }

  const server = http.createServer(app);

  // start IMAP watcher
  const imapConfig = {
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT || 993,
    tls: process.env.IMAP_TLS === 'true' || process.env.IMAP_TLS === true,
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    authTimeout: 30000
  };

  const pollSeconds = parseInt(process.env.IMAP_POLL_INTERVAL || '10', 10);
  const watcher = new IMAPWatcher(imapConfig);
  watcher.on('emailProcessed', (log) => {
    // could broadcast via WebSocket later
    console.log('emailProcessed event', log._id);
  });
  watcher.start(pollSeconds, token);

  // expose endpoint to get mailbox & token
  app.get('/test-info', (req, res) => {
    res.json({ testMailAddress: process.env.IMAP_USER, testSubjectToken: token });
  });

  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});
