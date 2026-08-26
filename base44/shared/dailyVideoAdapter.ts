/**
 * dailyVideoAdapter — dormant video-room adapter for "Meet Your Care Team"
 * virtual consultations, same discipline as currencyConvert.ts /
 * flightSearchAdapter.ts / providerDiscovery.ts: modeled on registryLookup.ts's
 * { supported: boolean } shape, honestly `{supported:false}` until a real
 * DAILY_API_KEY exists as a Base44 secret, live with zero further code the
 * moment one is added.
 *
 * No video-calling code of any kind existed anywhere in this repo before this
 * file — confirmed by a repo-wide search (no WebRTC, no video SDK, no package
 * dependency). Daily.co was picked as the vendor for its real free tier
 * (10K participant-minutes, $0.004/participant-minute after — verified live
 * via WebSearch, not memory, https://www.daily.co/blog/pricing-our-video-calling-api/)
 * and its "prebuilt room" iframe embed, which needs no WebRTC code on our side.
 *
 * NOTE: the request/response shapes below are written from Daily's REST API
 * documentation, NOT verified against a live call — re-confirm before this is
 * ever wired into a real, in-production consultation.
 *
 * COMPLIANCE NOTE (real, not a code concern this file can address): before
 * any real patient PHI flows through a live call, a signed Business Associate
 * Agreement (BAA) with Daily.co is a real HIPAA prerequisite (HHS OCR
 * telehealth guidance requires encryption in transit/at rest, access
 * controls, audit logging, and a signed BAA with every vendor touching PHI) —
 * a real business/legal step, separate from adding an API key, that this
 * adapter cannot verify or enforce.
 *
 * Meeting tokens are intentionally NEVER persisted anywhere (see
 * VirtualConsultation.jsonc's own header) — Base44 RLS is row-level, not
 * field-level, and a token needs different rights per participant (host vs.
 * guest); joinVirtualConsultation mints one fresh, per request, every time.
 */

const DAILY_API_BASE = 'https://api.daily.co/v1';
const FETCH_TIMEOUT_MS = 8000;

function apiKey(): string | undefined {
  return Deno.env.get('DAILY_API_KEY');
}

export type DailyRoomResult =
  | { supported: false; message: string }
  | { supported: true; provider: 'daily'; room_name: string; room_url: string; created_at: string; expires_at: string };

/**
 * createConsultationRoom — creates a real, private Daily room for exactly one
 * consultation, scoped to 2 participants. `enable_knocking:true` so a real
 * identity check happens at the room's own entry point once this is live —
 * the app must never claim identity was verified while video is unconfigured.
 *
 * @param seed a stable, unique identifier for this booking (used to build a
 *   real, non-guessable room name — e.g. the VirtualConsultation id).
 * @param expiresInSeconds how long the room stays valid for; defaults to 4
 *   hours after now, generous enough to cover a late join without leaving a
 *   room open indefinitely.
 */
export async function createConsultationRoom(
  seed: string,
  expiresInSeconds = 4 * 60 * 60,
): Promise<DailyRoomResult> {
  const key = apiKey();
  if (!key) {
    return {
      supported: false,
      message: 'No DAILY_API_KEY configured — live video consultations are not active yet. Add a Daily.co API key as a Base44 secret to activate this.',
    };
  }

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const roomName = `consult-${seed}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);

  try {
    const res = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp,
          enable_knocking: true,
          max_participants: 2,
          enable_chat: true,
          eject_at_room_exp: true,
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { supported: false, message: `Daily room creation failed (HTTP ${res.status}): ${detail.slice(0, 200)}` };
    }
    const data = await res.json();
    // Daily's real room-creation response is documented to always include a
    // real `url` — trust it, never guess a subdomain. A missing `url` here
    // means something unexpected happened server-side; report that honestly
    // instead of fabricating a link that would almost certainly point at
    // the wrong Daily account.
    if (!data.url) {
      return { supported: false, message: 'Daily room creation succeeded but returned no room URL — unexpected response shape.' };
    }
    return {
      supported: true,
      provider: 'daily',
      room_name: data.name || roomName,
      room_url: data.url,
      created_at: new Date().toISOString(),
      expires_at: new Date(exp * 1000).toISOString(),
    };
  } catch (e) {
    return { supported: false, message: `Daily room creation request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export type DailyTokenResult =
  | { supported: false; message: string }
  | { supported: true; token: string; expires_at: string };

/**
 * createMeetingToken — mints a fresh, short-lived token scoped to the real
 * caller's role. NEVER persisted by any caller — see this module's own header.
 */
export async function createMeetingToken(
  roomName: string,
  opts: { isOwner: boolean; userName: string; expiresInSeconds?: number },
): Promise<DailyTokenResult> {
  const key = apiKey();
  if (!key) {
    return {
      supported: false,
      message: 'No DAILY_API_KEY configured — live video consultations are not active yet.',
    };
  }

  const exp = Math.floor(Date.now() / 1000) + (opts.expiresInSeconds ?? 4 * 60 * 60);

  try {
    const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: opts.isOwner,
          user_name: opts.userName,
          exp,
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { supported: false, message: `Daily token creation failed (HTTP ${res.status}): ${detail.slice(0, 200)}` };
    }
    const data = await res.json();
    if (!data.token) return { supported: false, message: 'Daily token creation returned no token.' };
    return { supported: true, token: data.token, expires_at: new Date(exp * 1000).toISOString() };
  } catch (e) {
    return { supported: false, message: `Daily token creation request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export type DailyDeleteResult =
  | { supported: false; message: string }
  | { supported: true; deleted: true };

/** deleteRoom — best-effort cleanup; a booking cancellation should not fail just because this does. */
export async function deleteRoom(roomName: string): Promise<DailyDeleteResult> {
  const key = apiKey();
  if (!key) return { supported: false, message: 'No DAILY_API_KEY configured.' };

  try {
    const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok && res.status !== 404) {
      return { supported: false, message: `Daily room deletion failed (HTTP ${res.status}).` };
    }
    return { supported: true, deleted: true };
  } catch (e) {
    return { supported: false, message: `Daily room deletion request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
