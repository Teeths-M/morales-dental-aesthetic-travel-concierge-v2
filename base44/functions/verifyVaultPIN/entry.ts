import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pin, action } = await req.json();

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
      // Check if PIN already exists
      const existingPins = await base44.entities.VaultPIN.filter({ user_id: user.id });
      
      if (existingPins.length > 0) {
        // Update existing PIN
        await base44.entities.VaultPIN.update(existingPins[0].id, {
          pin_hash: pinHash,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new PIN
        await base44.entities.VaultPIN.create({
          user_id: user.id,
          user_email: user.email,
          pin_hash: pinHash,
          created_at: new Date().toISOString()
        });
      }

      return Response.json({ success: true });
    } else if (action === 'verify') {
      // Verify PIN
      const pins = await base44.entities.VaultPIN.filter({ user_id: user.id });
      
      if (pins.length === 0) {
        return Response.json({ valid: false, error: 'No PIN set' });
      }

      const isValid = pins[0].pin_hash === pinHash;
      return Response.json({ valid: isValid });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[verifyVaultPIN] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});