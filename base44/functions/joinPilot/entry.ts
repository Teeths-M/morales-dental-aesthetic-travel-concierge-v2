import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * joinPilot — the one real, working action on the landing page.
 *
 * Public by design: a pilot waiting list that requires an account is not a
 * waiting list. It collects an email address and nothing else, validates it
 * properly, and is idempotent — asking twice returns the same calm answer
 * rather than creating a duplicate or scolding the person.
 *
 * Runs as service role because the PilotSignup create rule is closed; that is
 * what stops a client from writing arbitrary rows straight into the table and
 * skipping this validation. The response deliberately says nothing about who
 * else is on the list, and never echoes back any record ids.
 */

const EMAIL_RE = /^[^\s@"<>()[\],;:\\]{1,64}@[^\s@."<>()[\],;:\\]{1,190}\.[A-Za-z]{2,24}$/;

const MAX_EMAIL_LENGTH = 254;

// 254 chars is the RFC ceiling; anything longer is not an address.
function normaliseEmail(raw) {
  const value = String(raw ?? '').trim();
  if (!value || value.length > MAX_EMAIL_LENGTH) return null;
  if (!EMAIL_RE.test(value)) return null;
  return value.toLowerCase();
}

function normaliseSource(raw) {
  const allowed = ['landing_hero', 'landing_greeting', 'pilot_page'];
  const value = String(raw ?? '').trim();
  return allowed.includes(value) ? value : 'pilot_page';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const email = normaliseEmail(body?.email);

    if (!email) {
      return Response.json(
        { error: 'That does not look like an email address. Please check it and try again.' },
        { status: 400 },
      );
    }

    const existing = await base44.asServiceRole.entities.PilotSignup
      .filter({ email }, '-created_date', 1)
      .catch(() => []);

    if (Array.isArray(existing) && existing.length > 0) {
      // Same calm answer as a first-time signup. Telling someone "you already
      // asked" is both unnecessary and a small privacy leak about their own
      // history to anyone who mistypes a stranger's address.
      return Response.json({ ok: true, already_joined: true });
    }

    await base44.asServiceRole.entities.PilotSignup.create({
      email,
      source: normaliseSource(body?.source),
      status: 'waiting',
    });

    return Response.json({ ok: true, already_joined: false });
  } catch (error) {
    console.error('[joinPilot]', error);
    return Response.json(
      { error: 'We could not save that just now. Please try again in a moment.' },
      { status: 500 },
    );
  }
}