import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Verifies the HMAC-signed reset token from the email link.
// action=verify  → returns { valid, email } (used by ResetPIN page on load)
// action=confirm → verifies token + sets new PIN server-side

const RESET_SECRET = Deno.env.get('PIN_RESET_SECRET') || 'morales-pin-reset-hmac-v1-2026';

async function signToken(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RESET_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decodeToken(token: string): { email: string; expiresAt: number } | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const [email, expiresAtStr] = decoded.split('|');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!email || isNaN(expiresAt)) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, sig, action, new_pin } = await req.json().catch(() => ({}));

    if (!token || !sig) {
      return Response.json({ valid: false, reason: 'invalid' });
    }

    const decoded = decodeToken(token);
    if (!decoded) return Response.json({ valid: false, reason: 'invalid' });

    if (Date.now() > decoded.expiresAt) {
      return Response.json({ valid: false, reason: 'expired' });
    }

    const expectedSig = await signToken(`${decoded.email}|${decoded.expiresAt}`);
    if (expectedSig !== sig) {
      return Response.json({ valid: false, reason: 'invalid' });
    }

    // Token is valid
    if (action === 'verify') {
      return Response.json({ valid: true, email: decoded.email });
    }

    if (action === 'confirm') {
      if (!new_pin || String(new_pin).length !== 6 || !/^\d{6}$/.test(String(new_pin))) {
        return Response.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }
      // Set new PIN server-side via existing verifyEmergencyPIN function
      await base44.functions.invoke('verifyEmergencyPIN', {
        action: 'setup',
        user_email: decoded.email,
        new_pin: String(new_pin),
      }).catch(() => {}); // Best-effort; frontend saves locally too

      return Response.json({ success: true, email: decoded.email });
    }

    return Response.json({ error: 'Invalid action. Use: verify | confirm' }, { status: 400 });
  } catch (err) {
    console.error('[confirmPINReset]', err);
    return Response.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
});
