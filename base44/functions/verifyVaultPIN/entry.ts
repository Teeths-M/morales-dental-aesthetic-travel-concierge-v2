import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pin, action, current_pin } = await req.json();

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return Response.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Hash the PIN using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (action === 'set') {
      // Generate salt for PBKDF2 (same as client-side)
      const emailData = encoder.encode(`morales_vault_${user.email.toLowerCase()}`);
      const salt = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', emailData))));
      
      // Hash PIN with PBKDF2 (600,000 iterations to match client)
      const keyMaterial = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
      const saltBinary = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
      const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBinary, iterations: 600000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      const pbkdf2Hash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
      
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
          const curKeyMaterial = await crypto.subtle.importKey('raw', encoder.encode(current_pin), 'PBKDF2', false, ['deriveBits']);
          const curSaltBinary = Uint8Array.from(atob(existingPins[0].pin_salt), c => c.charCodeAt(0));
          const curDerivedBits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: curSaltBinary, iterations: 600000, hash: 'SHA-256' },
            curKeyMaterial, 256
          );
          currentHashToCompare = btoa(String.fromCharCode(...new Uint8Array(curDerivedBits)));
        } else {
          const curData = encoder.encode(current_pin);
          const curHashBuffer = await crypto.subtle.digest('SHA-256', curData);
          currentHashToCompare = Array.from(new Uint8Array(curHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        if (currentHashToCompare !== existingPins[0].pin_hash) {
          return Response.json({ error: 'Incorrect current PIN' }, { status: 403 });
        }

        await base44.asServiceRole.entities.VaultPIN.update(existingPins[0].id, {
          pin_hash: pbkdf2Hash,
          pin_salt: salt,
          updated_at: new Date().toISOString()
        });
      } else {
        // No existing PIN -- first-time setup, nothing to verify against.
        await base44.asServiceRole.entities.VaultPIN.create({
          user_id: user.id,
          user_email: user.email,
          pin_hash: pbkdf2Hash,
          pin_salt: salt,
          created_at: new Date().toISOString()
        });
      }

      return Response.json({ success: true, salt });
    } else if (action === 'verify') {
      const pins = await base44.asServiceRole.entities.VaultPIN.filter({ user_id: user.id });
      
      if (pins.length === 0) {
        return Response.json({ valid: false, error: 'No PIN set' });
      }

      // Use PBKDF2 hash if salt exists, otherwise fallback to SHA-256
      let hashToCompare = pinHash;
      if (pins[0].pin_salt) {
        const keyMaterial = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
        const saltBinary = Uint8Array.from(atob(pins[0].pin_salt), c => c.charCodeAt(0));
        const derivedBits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: saltBinary, iterations: 600000, hash: 'SHA-256' },
          keyMaterial,
          256
        );
        hashToCompare = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
      }
      
      const isValid = pins[0].pin_hash === hashToCompare;
      return Response.json({ valid: isValid });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[verifyVaultPIN] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});