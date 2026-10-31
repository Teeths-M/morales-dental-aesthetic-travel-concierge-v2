import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { enforceRateLimit } from '../../shared/rateLimit.ts';

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
 *
 * NOTE ON THE ENTRYPOINT
 * ----------------------
 * This file used to be `export default async function (req) { ... }`, which is
 * NOT an entrypoint on Base44: a function only registers when it calls
 * Deno.serve(...), so every "join the pilot" submit from the landing page hit
 * an unregistered runtime and failed. The exports below are plain functions;
 * the handler is registered by Deno.serve at the bottom.
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
  const allowed = ['landing_hero', 'landing_greeting', 'pilot_page', 'mcare_chat'];
  const value = String(raw ?? '').trim();
  return allowed.includes(value) ? value : 'pilot_page';
}

// Which ad, card or post they scanned (the ?src= tag, e.g. ad29). Only a short
// plain tag is kept; anything else is dropped rather than stored.
function normaliseCampaign(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(value) ? value : '';
}

// Optional phone number (the M-Care chat asks for email and phone). Kept only if it holds 7 to 15 digits, stored as
// digits with a leading + when given; anything else is dropped rather than stored.
function normalisePhone(raw) {
  const value = String(raw ?? '').trim();
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return (value.startsWith('+') ? '+' : '') + digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public by design, so this is the abuse surface: cap signups per IP so the
    // waiting list cannot be filled by a script.
    const limited = await enforceRateLimit(base44, req, {
      functionName: 'joinPilot',
      max: 5,
      windowSeconds: 3600,
    });
    if (limited) return limited;

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

    const phone = normalisePhone(body?.phone);

    if (Array.isArray(existing) && existing.length > 0) {
      // Someone already on the list who now adds a phone number: keep it, never overwrite one already saved.
      if (phone && !existing[0].phone) {
        await base44.asServiceRole.entities.PilotSignup.update(existing[0].id, { phone }).catch(() => {});
      }
      // Same calm answer as a first-time signup. Telling someone "you already
      // asked" is both unnecessary and a small privacy leak about their own
      // history to anyone who mistypes a stranger's address.
      return Response.json({ ok: true, already_joined: true });
    }

    await base44.asServiceRole.entities.PilotSignup.create({
      email,
      source: normaliseSource(body?.source),
      campaign: normaliseCampaign(body?.campaign) || undefined,
      phone: phone || undefined,
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
});