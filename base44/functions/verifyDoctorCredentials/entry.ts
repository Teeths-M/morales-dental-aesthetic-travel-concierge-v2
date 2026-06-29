import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { doctor_id, license_number, country, specialty, document_urls = [] } = body;

    if (!doctor_id || !license_number || !country) {
      return Response.json({ error: 'Missing required fields: doctor_id, license_number, country' }, { status: 400 });
    }

    // Fetch doctor record
    const doctors = await base44.asServiceRole.entities.Doctor.filter({ id: doctor_id });
    const doctor = doctors[0];
    if (!doctor) {
      return Response.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Governance check: insufficient documentation = immediate rejection
    if (!document_urls || document_urls.length === 0) {
      await base44.asServiceRole.entities.Doctor.update(doctor_id, {
        verification_status: 'rejected'
      });
      return Response.json({ status: 'rejected', reason: 'Insufficient documentation' });
    }

    // Supported registries for primary source check
    const countryLower = country.toLowerCase();
    const registryMap = {
      colombia: 'RETHUS Colombia official medical registry',
      mexico: 'SEP Mexico Cedula Profesional medical registry',
      thailand: 'Thailand Medical Council official registry'
    };
    const matchedRegistry = Object.keys(registryMap).find(k => countryLower.includes(k));

    let registryFound = false;

    if (matchedRegistry) {
      try {
        const registryName = registryMap[matchedRegistry];
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: true,
          prompt: `Search the ${registryName} for medical license number "${license_number}". The doctor specializes in "${specialty || 'general medicine'}". 
Is this a valid, currently active medical license? Look for the license in official government databases or verification sites.
Return JSON: { "found": boolean, "confidence": number (0-100), "details": string }`,
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
        registryFound = result?.found === true && result?.confidence >= 70;
        console.log('Registry lookup result:', result);
      } catch (e) {
        console.error('Registry lookup failed:', e);
        registryFound = false;
      }
    }
    // Unsupported country: fall through to manual review automatically

    const doctorName = doctor.full_name || doctor.doctor_name || 'Doctor';
    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';

    if (registryFound) {
      // Verified by government registry
      await base44.asServiceRole.entities.Doctor.update(doctor_id, {
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verification_method: 'government_registry',
        credential_verified_date: new Date().toISOString()
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: doctor.email,
        subject: 'Your Credentials Have Been Verified — Morales Medical',
        body: `Dear Dr. ${doctorName},\n\nCongratulations! Your medical credentials have been successfully verified through the official government registry.\n\nYou are now fully activated on the Morales platform and can begin accepting patient cases.\n\nBest regards,\nMorales Medical Verification Team`
      });

      return Response.json({ status: 'verified', method: 'government_registry' });

    } else {
      // Queue for manual review
      await base44.asServiceRole.entities.ManualVerificationQueue.create({
        doctor_id,
        doctor_name: doctorName,
        license_number,
        country,
        specialty: specialty || '',
        document_urls,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        escalate_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        escalated: false
      });

      await base44.asServiceRole.entities.Doctor.update(doctor_id, {
        verification_status: 'pending_manual'
      });

      // Notify admin
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@moralesmedical.com',
        subject: `⚠️ Manual Verification Required — ${doctorName}`,
        body: `A doctor requires manual credential verification.\n\nDoctor: ${doctorName}\nLicense #: ${license_number}\nCountry: ${country}\nSpecialty: ${specialty || 'N/A'}\nDocuments uploaded: ${document_urls.length}\n\n⏰ 48-hour review deadline.\n\nReview queue: ${appUrl}/admin/doctor-verification`
      });

      return Response.json({ status: 'pending_manual', eta: '48 hours' });
    }

  } catch (error) {
    console.error('verifyDoctorCredentials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});