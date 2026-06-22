import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';

    // Get all doctors verified via government registry with expired verification
    const allVerifiedDoctors = await base44.asServiceRole.entities.Doctor.filter({
      verification_status: 'verified',
      verification_method: 'government_registry'
    });

    const expired = allVerifiedDoctors.filter(d => {
      const doc = d.data || d;
      return doc.verified_at && doc.verified_at < oneYearAgo;
    });

    console.log(`Re-verification check: ${expired.length} doctors with expired credentials`);

    let renewed = 0;
    let suspended = 0;
    const errors = [];

    const registryMap = {
      colombia: 'RETHUS Colombia official medical registry',
      mexico: 'SEP Mexico Cedula Profesional medical registry',
      thailand: 'Thailand Medical Council official registry'
    };

    for (const d of expired) {
      const doc = d.data || d;
      const doctorId = d.id;
      const countryLower = (doc.country || '').toLowerCase();
      const matchedRegistry = Object.keys(registryMap).find(k => countryLower.includes(k));

      if (!matchedRegistry || !doc.license_number) {
        // Can't auto-verify — queue for manual review, don't auto-suspend
        continue;
      }

      let stillValid = false;

      try {
        const registryName = registryMap[matchedRegistry];
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          prompt: `Check if medical license "${doc.license_number}" is still active and valid in ${registryName}. Return JSON: { "found": boolean, "confidence": number, "details": string }`,
          response_json_schema: {
            type: 'object',
            properties: {
              found: { type: 'boolean' },
              confidence: { type: 'number' },
              details: { type: 'string' }
            },
            required: ['found', 'confidence', 'details']
          }
        });
        stillValid = result.found === true && result.confidence >= 70;
      } catch (e) {
        errors.push({ doctorId, error: e.message });
        // Network/API failure — do NOT suspend, just log
        continue;
      }

      const doctorName = doc.full_name || doc.doctor_name || 'Unknown';

      if (stillValid) {
        // Silent renewal
        await base44.asServiceRole.entities.Doctor.update(doctorId, {
          verified_at: new Date().toISOString(),
          credential_verified_date: new Date().toISOString()
        });
        renewed++;
        console.log(`Silently renewed credentials for: ${doctorName}`);
      } else {
        // Suspend doctor
        await base44.asServiceRole.entities.Doctor.update(doctorId, {
          verification_status: 'suspended'
        });
        suspended++;

        // Notify admin immediately
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'admin@moralesmedical.com',
          subject: `🚨 Doctor Suspended — Credential Renewal Failed: ${doctorName}`,
          body: `Dr. ${doctorName} (License: ${doc.license_number}, ${doc.country}) was not found in the ${matchedRegistry} registry during annual re-verification.\n\nAccount has been suspended.\n\nReview: ${appUrl}/admin/doctor-verification`
        });

        // Notify doctor
        if (doc.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: doc.email,
            subject: 'Action Required: Annual Credential Renewal — Morales Medical',
            body: `Dear Dr. ${doctorName},\n\nYour annual credential renewal is required to continue operating on the Morales platform. Your account has been temporarily suspended pending re-verification.\n\nPlease contact us at admin@moralesmedical.com with updated documentation.\n\nBest regards,\nMorales Medical Verification Team`
          });
        }
      }
    }

    return Response.json({
      success: true,
      checked: expired.length,
      renewed,
      suspended,
      skipped_errors: errors.length
    });

  } catch (error) {
    console.error('reVerifyDoctorCredentials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});