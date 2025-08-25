/**
 * Basic heuristics to detect sender ESP from headers/addresses.
 * This is not perfect — it's a practical, extendable starting point.
 */

function detectESP(parsedHeaders) {
  // parsedHeaders is an object like mailparser provides: headers Map and other fields
  const from = (parsedHeaders.from && parsedHeaders.from.value && parsedHeaders.from.value[0]) || null;
  const fromDomain = from && from.address && from.address.split('@')[1];

  // Common ESP domain hints
  const espProviders = [
    { name: 'Gmail', hints: ['gmail.com', 'google.com', 'googlemail.com'] },
    { name: 'Outlook', hints: ['outlook.com', 'hotmail.com', 'office365.com', 'live.com', 'microsoft.com'] },
    { name: 'Yahoo', hints: ['yahoo.com', 'yahoo.co'] },
    { name: 'Amazon SES', hints: ['amazonses.com', 'ses.amazonaws.com'] },
    { name: 'SendGrid', hints: ['sendgrid.net', 'sendgrid.com'] },
    { name: 'Mailgun', hints: ['mailgun.org', 'mailgun.net'] },
    { name: 'Zoho', hints: ['zoho.com'] },
    { name: 'SparkPost', hints: ['sparkpostmail.com'] }
  ];

  if (fromDomain) {
    const fd = fromDomain.toLowerCase();
    for (const p of espProviders) {
      for (const hint of p.hints) {
        if (fd.endsWith(hint)) return p.name;
      }
    }
  }

  // Examine Received headers for known ESP hostnames or Amazon SES headers
  const received = parsedHeaders.headers && parsedHeaders.headers.get('received');
  if (received) {
    const r = Array.isArray(received) ? received.join('\n') : received;
    if (/amazonses/i.test(r)) return 'Amazon SES';
    if (/sendgrid/i.test(r)) return 'SendGrid';
    if (/mailgun/i.test(r)) return 'Mailgun';
  }

  // Fallback: check Return-Path
  const returnPath = parsedHeaders.headers && parsedHeaders.headers.get('return-path');
  if (returnPath) {
    const rp = String(returnPath).toLowerCase();
    if (rp.includes('amazonses')) return 'Amazon SES';
    if (rp.includes('sendgrid')) return 'SendGrid';
  }

  return 'Unknown';
}

module.exports = { detectESP };
