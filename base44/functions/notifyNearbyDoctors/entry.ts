import { createHandler, ok, err } from '../_shared/createHandler.ts';

const BRAND = 'Morales Dental & Aesthetic Travel Concierge';
const MAX_DOCTORS = 5;

// Maps procedure category keywords to Doctor.specialty substrings
const CATEGORY_SPECIALTY_MAP: Record<string, string[]> = {
  dental:         ['dental', 'dentist', 'oral', 'orthodont'],
  aesthetic:      ['aesthetic', 'plastic', 'cosmetic', 'dermatol'],
  hair:           ['hair', 'trichol', 'follicle', 'transplant'],
  bariatric:      ['bariatric', 'weight', 'gastric', 'obesity'],
  orthopedic:     ['orthopedic', 'orthopaedic', 'bone', 'spine', 'joint'],
  fertility:      ['fertility', 'reproduct', 'ivf', 'gynae', 'gynaecol'],
  wellness:       ['wellness', 'holistic', 'general'],
};

function detectCategory(query: string, procedureName: string): string {
  const text = `${query} ${procedureName}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_SPECIALTY_MAP)) {
    if (keywords.some(k => text.includes(k))) return cat;
  }
  return 'wellness'; // broadest fallback
}

function matchesSpecialty(doctorSpecialty: string, category: string): boolean {
  const spec = (doctorSpecialty || '').toLowerCase();
  const keywords = CATEGORY_SPECIALTY_MAP[category] || [];
  // General wellness doctors can also handle unknown queries
  if (category === 'wellness') return true;
  return keywords.some(k => spec.includes(k)) || spec === '' || spec === 'general';
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { patient_query, procedure_name, procedure_id, patient_city, patient_country } = await body<{
    patient_query: string;
    procedure_name: string;
    procedure_id?: string;
    patient_city?: string;
    patient_country?: string;
  }>();

  if (!patient_query || !procedure_name) {
    return err('patient_query and procedure_name are required');
  }

  const category = detectCategory(patient_query, procedure_name);

  // Fetch all active verified doctors
  const allDoctors = await base44.asServiceRole.entities.Doctor.filter({
    status: 'active',
    verification_status: 'verified',
  });

  if (!allDoctors || allDoctors.length === 0) {
    // Fallback: fetch any active doctors even if not yet verified (platform is growing)
    const anyDoctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
    if (!anyDoctors || anyDoctors.length === 0) {
      return ok({ success: true, doctors_notified: 0, message: 'No active doctors yet — M has logged your request.' });
    }
    allDoctors.push(...anyDoctors);
  }

  // Filter by specialty category, prefer same country as patient
  const ranked = allDoctors
    .map((d: Record<string, unknown>) => {
      const doc = (d.data || d) as Record<string, unknown>;
      const sameCountry = patient_country
        ? (doc.clinic_country as string || '').toLowerCase() === patient_country.toLowerCase()
        : false;
      const specialtyMatch = matchesSpecialty(doc.specialty as string || '', category);
      const score = (sameCountry ? 2 : 0) + (specialtyMatch ? 1 : 0);
      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DOCTORS)
    .map(({ doc }) => doc);

  if (ranked.length === 0) {
    // Notify any available doctor — always give the patient a result
    ranked.push(...allDoctors.slice(0, MAX_DOCTORS).map((d: Record<string, unknown>) => d.data || d));
  }

  const patientName = user?.full_name || 'A patient';
  const patientEmail = user?.email || '';
  const locationHint = patient_city ? `near ${patient_city}` : '';
  const now = new Date().toISOString();

  const outreachTasks = ranked.map(async (doc: Record<string, unknown>) => {
    const doctorEmail = doc.email as string;
    const doctorName = (doc.full_name as string) || 'Doctor';
    const doctorLang = (doc.language_preference as string) || 'en';

    const subject = `New Patient Request — ${procedure_name} | ${BRAND}`;

    const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #060B16; color: #ffffff; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0C1A1D, #080F18); padding: 32px; border-bottom: 1px solid rgba(212,175,55,0.3);">
    <div style="font-size: 28px; font-weight: 900; color: #D4AF37; letter-spacing: -0.03em;">M</div>
    <div style="font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px;">Morales Concierge</div>
  </div>
  <div style="padding: 32px;">
    <p style="font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">Hello Dr. ${doctorName},</p>
    <p style="font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 16px;">
      A patient ${locationHint} is looking for a specialist for the following:
    </p>
    <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
      <div style="font-size: 11px; color: #D4AF37; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">Patient Request</div>
      <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">${procedure_name}</div>
      <div style="font-size: 13px; color: rgba(255,255,255,0.5); font-style: italic;">"${patient_query}"</div>
    </div>
    <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 24px;">
      Can you accommodate this patient? Please reply to this email or log into your Morales Doctor Portal to respond.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://app.base44.app/doctor-portal" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #E8C85C); color: #060B16; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 99px; text-decoration: none;">
        Respond in My Portal →
      </a>
    </div>
    <p style="font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; margin: 0;">
      This request was sent to you by Morales Concierge on behalf of a verified patient.<br>
      Reply YES to accept, NO to decline, or MAYBE if you need more information.
    </p>
  </div>
</div>`;

    // Create outreach record
    await base44.asServiceRole.entities.DoctorProcedureOutreach.create({
      procedure_name,
      client_email: patientEmail,
      doctor_email: doctorEmail,
      email_sent_at: now,
      doctor_response: 'pending',
      status: 'pending',
    });

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: doctorEmail,
      subject,
      body,
    });

    return { doctor_name: doctorName, doctor_email: doctorEmail };
  });

  const results = await Promise.allSettled(outreachTasks);
  const notified = results.filter(r => r.status === 'fulfilled').length;

  return ok({
    success: true,
    doctors_notified: notified,
    procedure: procedure_name,
    category,
    message: `M has notified ${notified} specialist${notified !== 1 ? 's' : ''} about your request.`,
  });
}, { name: 'notifyNearbyDoctors', requireAuth: true }));
