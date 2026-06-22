import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastAuditHash(base44) {
  // BUG-R4-06 FIX: Sort by '-timestamp' (logical event order) not '-created_date'.
  // created_date is insertion time; timestamp is the audit event time. Using created_date
  // produces a wrong prev_hash when any backfill or out-of-order write occurs.
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

// Attempt automated verification via LLM-powered registry lookup
async function attemptAutoVerification(base44, country, registrationNumber, doctorName, specialty) {
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a medical registry verification assistant. Search the official medical registry for ${country} to verify if a doctor with registration number "${registrationNumber}" and name "${doctorName}" (specialty: ${specialty || 'General'}) is currently licensed and in good standing.

Check using the official registry data and return a JSON result. Be thorough but accurate. If you cannot definitively verify from registry data, return status "unverifiable".

Return JSON only: { "found": boolean, "name_match": boolean, "status": "verified"|"not_found"|"name_mismatch"|"suspended"|"unverifiable", "registry_source": string, "details": string }`,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          name_match: { type: 'boolean' },
          status: { type: 'string' },
          registry_source: { type: 'string' },
          details: { type: 'string' }
        }
      }
    });
    return result;
  } catch (_) {
    return { found: false, status: 'unverifiable', details: 'Auto-verification service unavailable' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, doctor_id, country, registration_number, specialty, notes, verification_record_id, denial_reason } = await req.json();

    const now = new Date().toISOString();

    // ── SUBMIT: Doctor submits verification request ──
    if (action === 'submit') {
      if (!country || !registration_number) {
        return Response.json({ error: 'country and registration_number required' }, { status: 400 });
      }

      // Check for existing pending/verified record
      const existing = await base44.asServiceRole.entities.DoctorVerification.filter({ doctor_id: user.id });
      if (existing.length > 0) {
        const active = existing.find(r => ['pending', 'auto_verified', 'manual_review', 'verified'].includes(r.verification_status));
        if (active) {
          return Response.json({ error: 'A verification record already exists. Please wait for review or contact support.', existing: active }, { status: 409 });
        }
      }

      // Get config for this country
      const configs = await base44.asServiceRole.entities.CountryVerificationConfig.filter({ country, is_active: true });
      const config = configs[0];

      let initialStatus = 'pending';
      let verificationMethod = 'manual';
      let autoResult = null;

      // Attempt auto-verification for API-capable countries
      if (config && (config.verification_type === 'api' || config.verification_type === 'hybrid')) {
        autoResult = await attemptAutoVerification(base44, country, registration_number, user.full_name, specialty);
        if (autoResult?.found && autoResult?.name_match && autoResult?.status === 'verified') {
          initialStatus = 'auto_verified';
          verificationMethod = 'api';
        } else {
          initialStatus = 'manual_review';
        }
      } else {
        initialStatus = 'manual_review';
      }

      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const verifiedAt = initialStatus === 'auto_verified' ? now : null;

      const record = await base44.asServiceRole.entities.DoctorVerification.create({
        doctor_id: user.id,
        doctor_name: user.full_name,
        doctor_email: user.email,
        country,
        registration_number,
        specialty: specialty || '',
        verification_status: initialStatus,
        verification_method: verificationMethod,
        registry_name: config?.registry_name || country + ' Medical Registry',
        registry_url: config?.registry_url || '',
        verified_at: verifiedAt,
        expires_at: initialStatus === 'auto_verified' ? expiresAt : null,
        last_checked_at: now,
        notes: autoResult?.details || '',
        submitted_at: now
      });

      // Audit log
      const prevHash = await getLastAuditHash(base44);
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_created',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        actor_email: user.email,
        resource_type: 'DoctorVerification',
        resource_id: record.id,
        details: { action: 'VERIFICATION_SUBMITTED', country, registration_number, initial_status: initialStatus, auto_result: autoResult },
        sensitive: false,
        timestamp: now,
        prev_hash: prevHash
      });

      // Notify admin if manual review needed
      if (initialStatus === 'manual_review') {
        const adminEmail = Deno.env.get('ADMIN_EMAIL');
        if (adminEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `🔍 Doctor Verification Pending — ${user.full_name} (${country})`,
            body: `<h2>Doctor Verification Review Required</h2><p><strong>Doctor:</strong> ${user.full_name}</p><p><strong>Country:</strong> ${country}</p><p><strong>Registration #:</strong> ${registration_number}</p><p><strong>Specialty:</strong> ${specialty || 'Not specified'}</p><p><strong>Registry:</strong> <a href="${config?.registry_url || '#'}">${config?.registry_name || country + ' Registry'}</a></p><p><a href="${Deno.env.get('APP_URL') || ''}/admin/doctor-verification">Review in Admin Panel →</a></p>`
          });
        }
      }

      return Response.json({ success: true, status: initialStatus, record_id: record.id, auto_result: autoResult });
    }

    // ── ADMIN VERIFY ──
    if (action === 'admin_verify') {
      if (user.role !== 'admin' && user.role !== 'platform_admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (!verification_record_id) return Response.json({ error: 'verification_record_id required' }, { status: 400 });

      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      // BUG-R4-04 FIX: SDK filter() cannot query by built-in `id` — always returns [].
      // List recent records for this admin action context and match by id on the JS side.
      const allVerifications = await base44.asServiceRole.entities.DoctorVerification.list('-submitted_at', 200);
      const records = allVerifications.filter(r => r.id === verification_record_id);
      if (!records.length) return Response.json({ error: 'Record not found' }, { status: 404 });

      await base44.asServiceRole.entities.DoctorVerification.update(verification_record_id, {
        verification_status: 'verified',
        verification_method: 'manual',
        verified_at: now,
        expires_at: expiresAt,
        last_checked_at: now,
        admin_reviewer_id: user.id,
        admin_reviewer_name: user.full_name,
        notes: notes || ''
      });

      // Notify doctor
      const rec = records[0];
      if (rec.doctor_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rec.doctor_email,
          subject: '✅ Your Doctor Verification is Approved — Morales Platform',
          body: `<h2>Verification Approved</h2><p>Dear Dr. ${rec.doctor_name},</p><p>Your medical license has been verified and is valid until ${new Date(expiresAt).toLocaleDateString()}.</p><p>You are now eligible to receive patient referrals on the Morales Platform.</p>`
        });
      }

      const prevHash = await getLastAuditHash(base44);
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'passport_access_approved',
        actor_id: user.id, actor_role: user.role, actor_name: user.full_name,
        resource_type: 'DoctorVerification', resource_id: verification_record_id,
        details: { action: 'VERIFICATION_VERIFIED', notes },
        sensitive: false, timestamp: now, prev_hash: prevHash
      });

      return Response.json({ success: true, expires_at: expiresAt });
    }

    // ── ADMIN DENY ──
    if (action === 'admin_deny') {
      if (user.role !== 'admin' && user.role !== 'platform_admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (!verification_record_id) return Response.json({ error: 'verification_record_id required' }, { status: 400 });

      // BUG-R4-04 FIX (admin_deny path): same SDK id-filter bug
      const allDenyVerifications = await base44.asServiceRole.entities.DoctorVerification.list('-submitted_at', 200);
      const records = allDenyVerifications.filter(r => r.id === verification_record_id);
      if (!records.length) return Response.json({ error: 'Record not found' }, { status: 404 });

      await base44.asServiceRole.entities.DoctorVerification.update(verification_record_id, {
        verification_status: 'denied',
        last_checked_at: now,
        admin_reviewer_id: user.id,
        admin_reviewer_name: user.full_name,
        denial_reason: denial_reason || 'Not provided',
        notes: notes || ''
      });

      const rec = records[0];
      if (rec.doctor_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rec.doctor_email,
          subject: '❌ Doctor Verification Denied — Morales Platform',
          body: `<h2>Verification Denied</h2><p>Dear Dr. ${rec.doctor_name},</p><p>Unfortunately, we were unable to verify your medical license.</p><p><strong>Reason:</strong> ${denial_reason || 'Your registration number could not be confirmed with the official registry.'}</p><p>Please contact support if you believe this is an error.</p>`
        });
      }

      const prevHash = await getLastAuditHash(base44);
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'passport_access_denied',
        actor_id: user.id, actor_role: user.role, actor_name: user.full_name,
        resource_type: 'DoctorVerification', resource_id: verification_record_id,
        details: { action: 'VERIFICATION_DENIED', denial_reason },
        sensitive: false, timestamp: now, prev_hash: prevHash
      });

      return Response.json({ success: true });
    }

    // ── GET STATUS (doctor views own record) ──
    if (action === 'get_status') {
      const targetId = (user.role === 'admin' || user.role === 'platform_admin') && doctor_id ? doctor_id : user.id;
      const records = await base44.asServiceRole.entities.DoctorVerification.filter({ doctor_id: targetId }, '-submitted_at', 5);
      return Response.json({ records });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    // BUG-R4-10 FIX: SEC-10 — never expose internal error details
    console.error('[runDoctorVerification]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});