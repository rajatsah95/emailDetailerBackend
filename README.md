# Backend

1. Copy `.env.example` to `.env` and fill IMAP and MongoDB details.
2. `npm ci` or `npm install`
3. `npm run dev` (requires nodemon) or `npm start`
4. Visit `GET /test-info` to see test mailbox address and subject token. Send an email to that mailbox with that subject token in the subject.

Notes:
- This implementation uses IMAP polling. For production, consider using webhook-based ingestion from Mailgun/Sendgrid/Postmark etc.
