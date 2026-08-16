import { createHandler } from '../../shared/createHandler.ts';
import { hashVaultPIN, MAX_PBKDF2_ITERATIONS, LEGACY_PIN_RESET_MESSAGE } from '../../shared/pinHashing.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { pin, action, current_pin } = await body();

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return Response.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Hash the PIN using SHA-256 -- kept for the legacy (pre-PBKDF2-migration)
    // plain-SHA256 fallback path further below, unrelated to the PBKDF2 fix.
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (action === 'set') {
      // Check if PIN already exists
      const existingPins = await base44.asServiceRole.entities.VaultPIN.filter({ user_id: user.id });

      if (existingPins.length > 0) {
        // SECURITY: a PIN already exists -- require the CURRENT pin (sent as
        // `current_pin`) to change it. Without this, a valid login session
        // alone (e.g. a borrowed/unlocked/stolen device) would be enough to
        // silently replace the vault PIN with an attacker-chosen one.
        if (!current_pin) {
          return Response.json({ error: 'current_pin_required', message: 'Enter your current PIN to set a new one.' }, { status: 400 });
        }
        let currentHashToCompare;
        if (existingPins[0].pin_salt) {
          // PBKDF2 record. Only verifiable if it carries a real iterations
          // count -- a pre-this-fix record (600,000, unreachable on this
          // runtime) has none and can never be recomputed. See pinHashing.ts.
          if (!existingPins[0].iterations) {
            return Response.json({ error: LEGACY_PIN_RESET_MESSAGE }, { status: 409 });
          }
          try {
            currentHashToCompare = await hashVaultPIN(current_pin, user.email, existingPins[0].iterations);
          } catch (_) {
            return Response.json({ error: LEGACY_PIN_RESET_MESSAGE }, { status: 409 });
          }
        } else {
          // Pre-PBKDF2-migration plain SHA-256 record -- unaffected by the
          // iteration-cap bug, unchanged.
          const curData = encoder.encode(current_pin);
          const curHashBuffer = await crypto.subtle.digest('SHA-256', curData);
          currentHashToCompare = Array.from(new Uint8Array(curHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        if (currentHashToCompare !== existingPins[0].pin_hash) {
          return Response.json({ error: 'Incorrect current PIN' }, { status: 403 });
        }
      }

      // Hash PIN with PBKDF2 at the confirmed platform ceiling, and store
      // that exact count alongside the hash -- self-describing, so a future
      // change can only ever affect new PINs, never silently break this one.
      const salt = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest(
        'SHA-256', encoder.encode(`morales_vault_${user.email.toLowerCase()}`),
      ))));
      const pbkdf2Hash = await hashVaultPIN(pin, user.email, MAX_PBKDF2_ITERATIONS);

      if (existingPins.length > 0) {
        await base44.asServiceRole.entities.VaultPIN.update(existingPins[0].id, {
          pin_hash: pbkdf2Hash,
          pin_salt: salt,
          iterations: MAX_PBKDF2_ITERATIONS,
          updated_at: new Date().toISOString()
        });
      } else {
        // No existing PIN -- first-time setup, nothing to verify against.
        await base44.asServiceRole.entities.VaultPIN.create({
          user_id: user.id,
          user_email: user.email,
          pin_hash: pbkdf2Hash,
          pin_salt: salt,
          iterations: MAX_PBKDF2_ITERATIONS,
          created_at: new Date().toISOString()
        });
      }

      return Response.json({ success: true, salt });
    } else if (action === 'verify') {
      // SECURITY: only 10,000 possible 4-digit PINs — without throttling, an
      // authenticated caller could brute-force their own (or a hijacked) session
      // in a tight loop. Mirrors the 5-attempts/30-min lockout used by verifyEmergencyPIN.
      const rateLimitKey = `vault_pin_verify_${user.id}_${Math.floor(Date.now() / (30 * 60 * 1000))}`;
      const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter(
        { bucket_key: rateLimitKey }, '-created_date', 1
      ).catch(() => []);
      const bucket = buckets?.[0];
      if (bucket && bucket.count >= 5) {
        return Response.json({ valid: false, error: 'Too many PIN attempts. Please wait 30 minutes before trying again.', locked: true }, { status: 429 });
      }
      await base44.asServiceRole.entities.RateLimitBucket.create({
        bucket_key: rateLimitKey,
        count: (bucket?.count || 0) + 1,
        window_start: new Date().toISOString(),
      }).catch(() => {});

      const pins = await base44.asServiceRole.entities.VaultPIN.filter({ user_id: user.id });

      if (pins.length === 0) {
        return Response.json({ valid: false, error: 'No PIN set' });
      }

      // Use PBKDF2 hash if salt exists, otherwise fallback to SHA-256
      let hashToCompare = pinHash;
      if (pins[0].pin_salt) {
        if (!pins[0].iterations) {
          return Response.json({ valid: false, error: LEGACY_PIN_RESET_MESSAGE }, { status: 409 });
        }
        try {
          hashToCompare = await hashVaultPIN(pin, user.email, pins[0].iterations);
        } catch (_) {
          return Response.json({ valid: false, error: LEGACY_PIN_RESET_MESSAGE }, { status: 409 });
        }
      }

      const isValid = pins[0].pin_hash === hashToCompare;
      return Response.json({ valid: isValid });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
}, { name: 'verifyVaultPIN' }));
