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

const ALLOWED_FIELDS_BY_LEVEL = {
  full_document: ['last_4_digits', 'expiry_date', 'nationality', 'full_name_redacted', 'document_type'],
  identity_only: ['last_4_digits', 'nationality', 'full_name_redacted', 'document_type'],
  travel_dates_only: ['expiry_date', 'nationality', 'document_type'],
  redacted_metadata: ['document_type', 'expiry_date']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grant_token, passport_token } = await req.json();

    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    let vault, access_level, grant;

    if (isAdmin && passport_token && !grant_token) {
      // Admin direct access by passport_token
      const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token });
      if (!vaults.length) return Response.json({ error: 'Vault not found' }, { status: 404 });
      vault = vaults[0];
      access_level = 'full_document';

    } else if (grant_token) {
      // Access via grant token
      const grants = await base44.asServiceRole.entities.PassportAccessGrant.filter({ grant_token });
      if (!grants.length) return Response.json({ error: 'Grant not found' }, { status: 404 });
      grant = grants[0];

      if (grant.status !== 'approved') {
        return Response.json({ error: 'Grant not approved', status: grant.status }, { status: 403 });
      }
      if (new Date(grant.expires_at) < new Date()) {
        await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, { status: 'expired' });
        return Response.json({ error: 'Grant has expired. Please request a new one.' }, { status: 403 });
      }

      const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token: grant.passport_token });
      if (!vaults.length) return Response.json({ error: 'Vault not found' }, { status: 404 });
      vault = vaults[0];
      access_level = grant.access_level;

      await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, {
        access_count: (grant.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      });

    } else {
      // Patient accessing their own vault
      const vaults = await base44.entities.PassportVault.filter({ passport_token });
      if (!vaults.length) return Response.json({ error: 'Vault not found' }, { status: 404 });
      vault = vaults[0];
      access_level = 'full_document';
    }

    // Build redacted response based on access level
    const allowedFields = ALLOWED_FIELDS_BY_LEVEL[access_level] || ALLOWED_FIELDS_BY_LEVEL['redacted_metadata'];
    const redacted_data = {};
    for (const field of allowedFields) {
      if (vault.redacted_for_display?.[field] !== undefined) {
        redacted_data[field] = vault.redacted_for_display[field];
      }
    }

    // For full_document: decrypt server-side and return a short-lived signed URL of the plaintext file.
    // Keys are NEVER transmitted to the client.
    let decrypted_file_url = null;

    const canDecrypt = access_level === 'full_document' && vault.encrypted_file_uri
      && vault.encryption_key_b64 && vault.encryption_iv_b64;

    if (canDecrypt) {
      // 1. Download the encrypted file via a short-lived signed URL
      const { signed_url: encSignedUrl } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: vault.encrypted_file_uri,
        expires_in: 60
      });
      const encRes = await fetch(encSignedUrl);
      if (!encRes.ok) throw new Error('Failed to fetch encrypted file from storage');
      const encryptedBytes = new Uint8Array(await encRes.arrayBuffer());

      // 2. Decrypt server-side — keys stay on the server
      const decryptedBytes = await decryptAesGcm(encryptedBytes, vault.encryption_key_b64, vault.encryption_iv_b64);

      // 3. Upload decrypted bytes to private storage as a temp file
      const blob = new Blob([decryptedBytes], { type: 'application/octet-stream' });
      const { file_uri: tempUri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: blob });

      // 4. Return a 5-minute signed URL to the decrypted file
      const { signed_url: decSignedUrl } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: tempUri,
        expires_in: 300
      });
      decrypted_file_url = decSignedUrl;
    }

    // Update vault access tracking
    await base44.asServiceRole.entities.PassportVault.update(vault.id, {
      last_accessed_at: new Date().toISOString(),
      access_count: (vault.access_count || 0) + 1
    });

    // Immutable audit log
    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token: vault.passport_token,
      patient_id: vault.created_by_id,
      patient_email: vault.patient_email,
      actor_id: user.id,
      actor_role: grant ? grant.requester_role : (isAdmin ? 'admin' : 'patient'),
      actor_name: user.full_name,
      action: 'view',
      grant_token: grant?.grant_token || null,
      status: 'success',
      timestamp: new Date().toISOString(),
      metadata: { access_level, fields_exposed: allowedFields, can_decrypt: canDecrypt, decrypted_url_issued: !!decrypted_file_url }
    });

    return Response.json({
      success: true,
      access_level,
      passport_token: vault.passport_token,
      redacted_data,
      decrypted_file_url,   // short-lived 5-min signed URL to plaintext file (null if access_level < full_document)
      expires_at: vault.expires_at
    });

  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});