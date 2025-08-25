/**
 * Watches the configured IMAP mailbox at intervals and processes matching messages.
 * Uses node-imap + mailparser to extract headers and throw the results to the DB.
 */

const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const EmailLog = require('./models/EmailLog');
const { detectESP } = require('./utils/espDetector');
const { EventEmitter } = require('events');

class IMAPWatcher extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.imap = null;
    this.connected = false;
  }

  _createConnection() {
    const opts = {
      user: this.config.user,
      password: this.config.password,
      host: this.config.host,
      port: parseInt(this.config.port, 10) || 993,
      tls: this.config.tls === 'true' || this.config.tls === true
    };
    return new Imap(opts);
  }

  start(pollIntervalSeconds, testSubjectToken) {
    this.pollIntervalSeconds = pollIntervalSeconds || 10;
    this.testSubjectToken = testSubjectToken;
    this._poll();
  }

  _openInbox(cb) {
    this.imap.openBox('INBOX', false, cb);
  }

  _poll() {
    // create fresh connection each poll to keep things robust against idle disconnects
    this.imap = this._createConnection();

    this.imap.once('ready', () => {
      this.connected = true;
      this._openInbox((err, box) => {
        if (err) {
          console.error('Failed to open inbox', err);
          this.imap.end();
          return setTimeout(() => this._poll(), this.pollIntervalSeconds * 1000);
        }

        // search for unseen messages matching the subject token
        const criteria = [['UNSEEN'], ['HEADER', 'SUBJECT', this.testSubjectToken]];
        this.imap.search(criteria, (err, results) => {
          if (err) {
            console.error('IMAP search error', err);
            this.imap.end();
            return setTimeout(() => this._poll(), this.pollIntervalSeconds * 1000);
          }

          if (!results || results.length === 0) {
            // nothing to do
            this.imap.end();
            return setTimeout(() => this._poll(), this.pollIntervalSeconds * 1000);
          }

          const f = this.imap.fetch(results, { bodies: '' });
          f.on('message', (msg, seqno) => {
            let raw = '';
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { raw += chunk.toString('utf8'); });
            });
            msg.once('attributes', (attrs) => {
              // nothing
            });
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(raw);
                // Extract receiving chain from Received headers
                const receivedHeaders = parsed.headerLines
                  .filter(h => h.key.toLowerCase() === 'received')
                  .map(h => h.line);

                // If headerLines empty, fallback to headers.get('received')
                let chain = receivedHeaders;
                if ((!chain || chain.length === 0) && parsed.headers && parsed.headers.get('received')) {
                  const r = parsed.headers.get('received');
                  chain = Array.isArray(r) ? r : [String(r)];
                }

                const esp = detectESP(parsed);

                const emailLog = new EmailLog({
                  subject: parsed.subject,
                  from: parsed.from && parsed.from.text,
                  to: parsed.to && parsed.to.text,
                  date: parsed.date,
                  rawHeaders: parsed.headers && Object.fromEntries(parsed.headers),
                  rawText: parsed.text || parsed.html || '',
                  receivedChain: chain,
                  esp
                });
                await emailLog.save();
                console.log('Saved processed email:', emailLog._id);
                this.emit('emailProcessed', emailLog);

                // mark message as Seen
                const uid = attrs && attrs.uid;
                if (uid) {
                  this.imap.addFlags(uid, '\\Seen', (err) => {
                    if (err) console.error('Failed to add Seen flag', err);
                  });
                }
              } catch (err) {
                console.error('Failed to parse message', err);
              }
            });
          });

          f.once('error', (err) => { console.error('Fetch error', err); });
          f.once('end', () => {
            this.imap.end();
            setTimeout(() => this._poll(), this.pollIntervalSeconds * 1000);
          });
        });
      });
    });

    this.imap.once('error', (err) => {
      console.error('IMAP connection error', err);
      this.connected = false;
      try { this.imap.end(); } catch (e) {}
      setTimeout(() => this._poll(), this.pollIntervalSeconds * 1000);
    });

    this.imap.once('end', () => { this.connected = false; });

    this.imap.connect();
  }
}

module.exports = IMAPWatcher;
