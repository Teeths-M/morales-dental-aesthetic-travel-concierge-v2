import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function decryptAesGcm(encryptedBytes, keyB64, ivB64) {
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'AES-GCM', length: 256 },
    false, ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  return new Uint8Array(decryptedBuffer);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passport_token } = await req.json();
    if (!passport_token) return Response.json({ error: 'passport_token required' }, { status: 400 });

    // Fetch vault record via service role
    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token });
    if (!vaults?.length) return Response.json({ error: 'Passport not found' }, { status: 404 });

    const vault = vaults[0];

    // Authorization: only owner or admin
    if (vault.patient_email !== user.email && user.role !== 'admin') {
      await base44.asServiceRole.entities.PassportAuditLog.create({
        passport_token,
        patient_email: vault.patient_email,
        actor_id: user.id,
        actor_role: user.role || 'unknown',
        actor_name: user.full_name,
        action: 'view',
        status: 'denied',
        reason_if_denied: 'Unauthorized access attempt',
        timestamp: new Date().toISOString()
      });
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get signed URL for the encrypted file from private storage
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: vault.encrypted_file_uri,
      expires_in: 60
    });

    // Download encrypted file
    const fileRes = await fetch(signed_url);
    if (!fileRes.ok) return Response.json({ error: 'Failed to fetch encrypted file' }, { status: 500 });
    const encryptedBytes = new Uint8Array(await fileRes.arrayBuffer());

    // Decrypt server-side — keys never sent to browser
    const decryptedBytes = await decryptAesGcm(encryptedBytes, vault.encryption_key_b64, vault.encryption_iv_b64);

    // Convert to base64 for response
    const decryptedB64 = btoa(String.fromCharCode(...decryptedBytes));

    // Log successful access
    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token,
      patient_email: vault.patient_email,
      actor_id: user.id,
      actor_role: user.role === 'admin' ? 'admin' : 'patient',
      actor_name: user.full_name,
      action: 'view',
      status: 'success',
      timestamp: new Date().toISOString()
    });

    // Increment access counter
    await base44.asServiceRole.entities.PassportVault.update(vault.id, {
      access_count: (vault.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    return Response.json({ decryptedB64, mimeType: 'image/jpeg' });

  } catch (error) {
    console.error('decryptPassportFile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});