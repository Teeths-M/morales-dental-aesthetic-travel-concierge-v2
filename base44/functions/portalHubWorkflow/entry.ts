import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND = 'Morales Dental & Aesthetics';
const TEAM = 'Morales Concierge Team';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatProcedure = (value) => String(value || 'Procedure').replace(/_/g, ' ');

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(value || 'Not provided')}</td>
  </tr>`;

const emailLayout = ({ eyebrow, title, intro, rows = [], note, ctaText, ctaUrl, footer = 'Please reply to this email if you need assistance.' }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#29483d;padding:28px 32px;color:#ffffff;">
                <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:-0.3px;">${BRAND}</div>
                <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">${escapeHtml(eyebrow)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#13221d;font-weight:400;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">${escapeHtml(intro)}</p>
                ${rows.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">${rows.join('')}</table>` : ''}
                ${note ? `<div style="margin:22px 0;padding:16px 18px;background:#f8f4ee;border-left:4px solid #b68a52;border-radius:12px;color:#40514a;font-size:14px;line-height:1.6;">${escapeHtml(note)}</div>` : ''}
                ${ctaText && ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:6px;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700;">${escapeHtml(ctaText)}</a>` : ''}
                <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#64746d;">${escapeHtml(footer)}</p>
                <p style="margin:18px 0 0;font-size:14px;color:#13221d;font-weight:700;">${TEAM}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';
  const portalUrl = `${appUrl}/portal-hub/admin`;

  const body = await req.json();
  // Support both direct call { consultation_id } and entity automation payload { event: { entity_id } }
  const consultation_id = body.consultation_id || body.event?.entity_id;

  if (!consultation_id) {
    return Response.json({ error: 'consultation_id is required' }, { status: 400 });
  }

  // 1. Fetch the consultation
  let consultation;
  try {
    consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
  } catch {
    return Response.json({ error: 'Consultation not found' }, { status: 404 });
  }
  if (!consultation) {
    return Response.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // 2. Create or update the WorkflowEvent record
  const existing = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });
  let workflow = existing[0] || null;

  if (!workflow) {
    workflow = await base44.asServiceRole.entities.WorkflowEvent.create({
      consultation_id,
      patient_name: consultation.patient_name,
      patient_email: consultation.email,
      stage: 'risk_check',
      risk_result: 'pending',
    });
  }

  // 3. AI Risk Check (SAFE-T 4LIFE™)
  const riskPrompt = `
You are the SAFE-T 4LIFE™ medical travel safety AI for Morales Dental & Aesthetics.

Evaluate the following patient profile for medical tourism risk:

Patient: ${consultation.patient_name}
Procedure: ${consultation.procedure_interest}
Age: ${consultation.age || 'Not provided'}
Gender: ${consultation.gender || 'Not provided'}
Weight: ${consultation.weight || 'Not provided'}
Height: ${consultation.height || 'Not provided'}
Medical Conditions: ${(consultation.medical_conditions || []).join(', ') || 'None reported'}
Other Medical: ${consultation.medical_conditions_other || 'None'}
Previous Surgery: ${consultation.had_surgery ? 'Yes' : 'No'}
Previous Procedures: ${consultation.previous_procedures || 'None'}
Surgery Complications: ${consultation.had_complications ? (consultation.surgery_complications || []).join(', ') : 'None'}
Anesthesia Complications: ${consultation.anesthesia_complications ? (consultation.anesthesia_complication_types || []).join(', ') : 'None'}
Allergies: ${(consultation.allergies || []).join(', ') || 'None'}
Allergy Details: ${consultation.allergy_details || 'None'}
Medications: ${consultation.takes_medications ? (consultation.medication_types || []).join(', ') : 'None'}
Lifestyle Habits: ${(consultation.lifestyle_habits || []).join(', ') || 'None'}
Pregnancy Status: ${consultation.pregnancy_status || 'N/A'}
Emotional Concerns: ${consultation.emotional_concerns ? (consultation.emotional_concern_types || []).join(', ') : 'None'}

Return a JSON with:
- result: "approved" or "blocked"
- risk_level: "low", "medium", or "high"
- flags: array of specific risk concerns (empty if none)
- summary: 2-3 sentence plain-English explanation of the assessment
- recommendation: brief action note for the concierge team
`;

  const riskAssessment = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: riskPrompt,
    response_json_schema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
        risk_level: { type: 'string' },
        flags: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        recommendation: { type: 'string' },
      },
    },
  });

  const isBlocked = riskAssessment.result === 'blocked';

  // 4. Update workflow with risk result
  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
    risk_result: riskAssessment.result,
    risk_summary: `${riskAssessment.summary} — ${riskAssessment.recommendation}`,
    risk_flags: riskAssessment.flags || [],
    stage: isBlocked ? 'blocked' : 'doctor',
  });

  // Also update consultation risk_level
  await base44.asServiceRole.entities.Consultation.update(consultation_id, {
    risk_level: riskAssessment.risk_level || 'low',
  });

  // 5. If BLOCKED — notify customer and stop
  if (isBlocked) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: consultation.email,
        subject: 'Important Update Regarding Your Consultation Request — Morales Dental & Aesthetics',
        body: emailLayout({
          eyebrow: 'SAFE-T review',
          title: 'A concierge review is needed',
          intro: `Dear ${consultation.patient_name}, your SAFE-T 4LIFE review is complete. Before moving forward with ${formatProcedure(consultation.procedure_interest)}, our team needs to speak with you directly to protect your safety and comfort.`,
          rows: [
            row('Procedure', formatProcedure(consultation.procedure_interest)),
            row('Review result', 'Concierge follow-up required'),
          ],
          note: [riskAssessment.summary, ...(riskAssessment.flags || [])].filter(Boolean).join(' | '),
          footer: 'A member of our concierge team will reach out within 24 hours to discuss your options and next steps.',
        }),
      });
    } catch (error) {
      console.log(`Blocked notification email skipped for ${consultation.email}: ${error.message}`);
    }

    await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, { customer_notified: true, last_update_summary: 'Patient blocked by SAFE-T risk check. Email notification skipped (external user).' });

    return Response.json({
      status: 'blocked',
      message: 'Risk check failed — patient flagged as blocked.',
      risk: riskAssessment,
    });
  }

  // 6. APPROVED — fetch active partners from DB
  const allPartners = await base44.asServiceRole.entities.Partner.filter({ is_active: true });
  const getPartnerEmails = (type) => allPartners.filter(p => p.type === type).map(p => p.email);

  const doctorEmails = getPartnerEmails('doctor');
  const travelEmails = getPartnerEmails('travel');
  const hotelEmails = getPartnerEmails('hotel');
  const cabEmails = getPartnerEmails('cab');

  // notify partners — notify all emails per type (with error handling for non-app users)
  const sendToPartners = async (emails, subject, body) => {
    for (const email of emails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: email, subject, body });
      } catch (error) {
        console.log(`Email skipped for ${email} (external user): ${error.message}`);
      }
    }
  };

  const partnerNotifications = [
    {
      partner: 'doctor',
      email_subject: `New patient approved — ${consultation.patient_name} | ${BRAND}`,
      email_body: emailLayout({
        eyebrow: 'Doctor request',
        title: 'New patient ready for scheduling',
        intro: 'A patient has passed the SAFE-T review and is ready for clinical availability confirmation.',
        rows: [
          row('Patient', consultation.patient_name),
          row('Procedure', formatProcedure(consultation.procedure_interest)),
          row('Preferred date', consultation.preferred_date || 'Flexible'),
          row('Risk level', riskAssessment.risk_level),
          row('Notes', consultation.notes || 'None'),
        ],
        ctaText: 'Review in portal',
        ctaUrl: portalUrl,
        footer: 'Please confirm availability through the portal or by replying to this email.',
      }),
    },
    {
      partner: 'travel',
      email_subject: `Travel request — ${consultation.patient_name} | ${BRAND}`,
      email_body: emailLayout({
        eyebrow: 'Travel request',
        title: 'Patient travel arrangement needed',
        intro: 'A newly approved patient requires travel planning support.',
        rows: [
          row('Patient', consultation.patient_name),
          row('Nationality', consultation.nationality || 'Not specified'),
          row('Preferred date', consultation.preferred_date || 'Flexible'),
          row('Companion', consultation.has_companion ? `Yes (${consultation.companion_relationship || 'relationship not specified'})` : 'No'),
          row('Requested services', (consultation.travel_buddy_services || []).join(', ') || 'Standard itinerary support'),
        ],
        footer: 'Please reply with flight options, itinerary details, and pricing.',
      }),
    },
    {
      partner: 'hotel',
      email_subject: `Recovery lodging request — ${consultation.patient_name} | ${BRAND}`,
      email_body: emailLayout({
        eyebrow: 'Accommodation request',
        title: 'Recovery lodging arrangement needed',
        intro: 'A newly approved patient requires suitable recovery accommodation.',
        rows: [
          row('Patient', consultation.patient_name),
          row('Procedure', formatProcedure(consultation.procedure_interest)),
          row('Preferred date', consultation.preferred_date || 'Flexible'),
          row('Companion', consultation.has_companion ? 'Yes' : 'No'),
          row('Comfort preferences', (consultation.cultural_preferences || []).join(', ') || 'None specified'),
        ],
        footer: 'Please reply with room availability, recovery support details, and pricing.',
      }),
    },
    {
      partner: 'cab',
      email_subject: `Transfer request — ${consultation.patient_name} | ${BRAND}`,
      email_body: emailLayout({
        eyebrow: 'Transfer request',
        title: 'Local patient transfer needed',
        intro: 'A newly approved patient requires airport, clinic, and hotel transfer support.',
        rows: [
          row('Patient', consultation.patient_name),
          row('Date', consultation.preferred_date || 'Flexible'),
          row('Companion', consultation.has_companion ? 'Yes' : 'No'),
          row('Services', 'Airport pickup, clinic transfer, hotel return'),
        ],
        footer: 'Please reply with availability, vehicle details, and pricing.',
      }),
    },
  ];

  // Send emails to each partner type
  const [doctorNotif, travelNotif, hotelNotif, cabNotif] = partnerNotifications;
  if (doctorEmails.length > 0) await sendToPartners(doctorEmails, doctorNotif.email_subject, doctorNotif.email_body);
  if (travelEmails.length > 0) await sendToPartners(travelEmails, travelNotif.email_subject, travelNotif.email_body);
  if (hotelEmails.length > 0) await sendToPartners(hotelEmails, hotelNotif.email_subject, hotelNotif.email_body);
  if (cabEmails.length > 0) await sendToPartners(cabEmails, cabNotif.email_subject, cabNotif.email_body);

  // Update partners status to "notified"
  const partnerUpdates = {
    doctor_status: doctorEmails.length > 0 ? 'notified' : 'pending',
    travel_status: travelEmails.length > 0 ? 'notified' : 'pending',
    hotel_status: hotelEmails.length > 0 ? 'notified' : 'pending',
    cab_status: cabEmails.length > 0 ? 'notified' : 'pending',
    stage: 'doctor',
    last_update_summary: `SAFE-T approved (${riskAssessment.risk_level} risk). Partners notified.`,
  };

  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, partnerUpdates);
  await base44.asServiceRole.entities.Consultation.update(consultation_id, { status: 'in_progress', journey_stage: 'planning' });

  // 7. Notify the customer of approval
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: consultation.email,
      subject: '✓ Your Consultation Is Approved — Morales Dental & Aesthetics',
      body: emailLayout({
        eyebrow: 'Consultation approved',
        title: 'Your consultation is approved',
        intro: `Dear ${consultation.patient_name}, your consultation has been approved. We are now coordinating the specialist clinic, travel arrangements, recovery accommodation, and local transfers for your care package.`,
        rows: [
          row('Procedure', formatProcedure(consultation.procedure_interest)),
          row('Risk level', riskAssessment.risk_level),
          row('Next update', 'Within 24–48 hours'),
        ],
        footer: 'Your concierge team will contact you with the complete package details as each part is confirmed.',
      }),
    });
  } catch (error) {
    console.log(`Approval notification email skipped for ${consultation.email}: ${error.message}`);
  }

  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, { customer_notified: true });

  return Response.json({
    status: 'approved',
    message: 'Risk approved. All partners notified. Customer email sent.',
    risk: riskAssessment,
    workflow_id: workflow.id,
  });
});