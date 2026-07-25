// ── Test-mailbox IMAP poller ────────────────────────────────────────────────
//
// Waits for a real email to arrive at a test address the team owns, so the
// doctor-nomination Approve step gets checked against what was actually
// sent — not trusted on faith. Requires TEST_MAILBOX_HOST/PORT/USER/PASSWORD
// env vars; callers should skip gracefully (see ai-agent.spec.js) when
// they're not configured, the same way journey.spec.js skips without a
// saved login.

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

function extractLinks(htmlOrText) {
  const matches = (htmlOrText || '').match(/https?:\/\/[^\s"'<>]+/g) || [];
  return [...new Set(matches)];
}

export function testMailboxConfigured() {
  return !!(process.env.TEST_MAILBOX_HOST && process.env.TEST_MAILBOX_USER && process.env.TEST_MAILBOX_PASSWORD);
}

/**
 * Polls INBOX for the most recent message to `toAddress` received after
 * `sinceDate`. Returns { subject, text, html, links } or null on timeout —
 * never throws on "not found yet", only on a real connection/auth failure.
 */
export async function waitForTestEmail({ toAddress, sinceDate, timeoutMs = 60_000, pollMs = 4_000 }) {
  if (!testMailboxConfigured()) {
    throw new Error('TEST_MAILBOX_HOST/USER/PASSWORD are not set — call testMailboxConfigured() first.');
  }

  const since = sinceDate || new Date(Date.now() - 10 * 60 * 1000);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const client = new ImapFlow({
      host: process.env.TEST_MAILBOX_HOST,
      port: Number(process.env.TEST_MAILBOX_PORT || 993),
      secure: true,
      auth: { user: process.env.TEST_MAILBOX_USER, pass: process.env.TEST_MAILBOX_PASSWORD },
      logger: false,
    });

    await client.connect();
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const uids = await client.search({ to: toAddress, since });
        if (uids?.length) {
          const uid = uids[uids.length - 1]; // most recent match
          const { content } = await client.download(uid);
          const parsed = await simpleParser(content);
          const body = parsed.html || parsed.text || '';
          return {
            subject: parsed.subject || '',
            text: parsed.text || '',
            html: parsed.html || '',
            links: extractLinks(body),
          };
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return null;
}
