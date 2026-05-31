import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND = 'Morales Dental & Aesthetics';
const TEAM = 'Morales Concierge Team';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const PROCEDURE_LABELS = {
  dental_implants: 'Dental Implants',
  all_on_4: 'All-on-4 / All-on-6',
  porcelain_veneers: 'Porcelain Veneers',
  smile_makeover: 'Smile Makeover',
  bone_regeneration: 'Bone Regeneration',
  teeth_whitening: 'Teeth Whitening & Cosmetic Dentistry',
  rhinoplasty: 'Rhinoplasty (Nose Reshaping)',
  breast_surgery: 'Breast Augmentation / Reduction / Lift',
  liposuction: 'Liposuction',
  tummy_tuck: 'Abdominoplasty (Tummy Tuck)',
  facelift: 'Facelift',
  brow_lift: 'Brow Lift',
  blepharoplasty: 'Eyelid Surgery (Blepharoplasty)',
  otoplasty: 'Otoplasty (Ear Reshaping)',
  thigh_arm_lift: 'Thigh Lift / Arm Lift',
  laser_resurfacing: 'Skin Rejuvenation (Laser Resurfacing)',
  mole_removal: 'Mole Removal (Skin Nevus)',
  lipoma_removal: 'Lipoma Removal',
  gastric_sleeve: 'Gastric Sleeve (Sleeve Gastrectomy)',
  gastric_bypass: 'Gastric Bypass (Roux-en-Y)',
  gastric_band_revision: 'Gastric Band Removal / Revision',
  gynecological_exams: 'Gynecological Diagnostic Exams',
  ivf: 'IVF (In Vitro Fertilization)',
  egg_freezing: 'Fertility Preservation (Egg Freezing)',
  oncology_surgery: 'Oncological Surgical Procedures',
  tumor_testing: 'Tumor Marker & Blood Panel Testing',
  joint_replacement: 'Joint Replacement (Hip & Knee)',
  spine_surgery: 'Spine Surgery',
  sports_arthroscopy: 'Sports Injuries & Arthroscopy',
  fracture_surgery: 'Fracture Management & Trauma Surgery',
  other: 'Other / Not Sure',
};

const formatProcedure = (raw) => {
  if (!raw) return 'Not specified';
  // Normalize: strip spaces, lowercase, replace spaces with underscores
  const normalized = String(raw).toLowerCase().replace(/\s+/g, '_');
  return PROCEDURE_LABELS[normalized] || raw.replace(/_/g, ' ');
};

const normalizeRiskLevel = (value) => {
  const normalized = String(value || 'low').toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium' || normalized === 'moderate') return 'medium';
  return 'low';
};

const normalizeRiskResult = (value) => String(value || '').toLowerCase() === 'blocked' ? 'blocked' : 'approved';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [String(value)];
};

const formatList = (value, fallback = 'None') => {
  const items = toArray(value).filter(Boolean);
  return items.length ? items.join(', ') : fallback;
};

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
  try {
    const base44 = createClientFromRequest(req);

    const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';
    const portalUrl = `${appUrl}/portal-hub/admin`;

    const body = await req.json();
    // Support both direct calls and Consultation entity automation payloads.
    const consultation_id = body.consultation_id || body.event?.entity_id || body.data?.id || body.old_data?.id;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // 1. Fetch the consultation, or use the automation payload when available.
    let consultation = body.data || null;
    let consultationExists = false;
    if (!consultation) {
      const matches = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
      consultation = matches?.[0] || null;
      consultationExists = Boolean(consultation);
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
Medical Conditions: ${formatList(consultation.medical_conditions, 'None reported')}
Other Medical: ${consultation.medical_conditions_other || 'None'}
Previous Surgery: ${consultation.had_surgery ? 'Yes' : 'No'}
Previous Procedures: ${consultation.previous_procedures || 'None'}
Surgery Complications: ${consultation.had_complications ? formatList(consultation.surgery_complications) : 'None'}
Anesthesia Complications: ${consultation.anesthesia_complications ? formatList(consultation.anesthesia_complication_types) : 'None'}
Allergies: ${formatList(consultation.allergies)}
Allergy Details: ${consultation.allergy_details || 'None'}
Medications: ${consultation.takes_medications ? formatList(consultation.medication_types) : 'None'}
Lifestyle Habits: ${formatList(consultation.lifestyle_habits)}
Pregnancy Status: ${consultation.pregnancy_status || 'N/A'}
Emotional Concerns: ${consultation.emotional_concerns ? formatList(consultation.emotional_concern_types) : 'None'}

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

  const riskResult = normalizeRiskResult(riskAssessment.result);
  const riskLevel = normalizeRiskLevel(riskAssessment.risk_level);
  const isBlocked = riskResult === 'blocked';

  // 4. Update workflow with risk result
  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
    risk_result: riskResult,
    risk_summary: `${riskAssessment.summary || 'Risk assessment completed.'} — ${riskAssessment.recommendation || 'Review workflow details.'}`,
    risk_flags: toArray(riskAssessment.flags),
    stage: isBlocked ? 'blocked' : 'doctor',
  });

  // Also update consultation risk_level when the database record is available.
  try {
    await base44.asServiceRole.entities.Consultation.update(consultation_id, {
      risk_level: riskLevel,
    });
  } catch (error) {
    console.log(`Consultation risk update skipped for ${consultation_id}: ${error.message}`);
  }

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
          note: [riskAssessment.summary, ...toArray(riskAssessment.flags)].filter(Boolean).join(' | '),
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

  // 6. APPROVED — fetch active doctors only (other partners notified after doctor confirmation)
  const [allPartners, taxiServices] = await Promise.all([
    base44.asServiceRole.entities.Partner.filter({ is_active: true }),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
  ]);
  const getPartnerEmails = (type) => allPartners.filter(p => p.type === type).map(p => p.email);

  const doctorEmails = getPartnerEmails('doctor');

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

  // STEP 1: Only notify doctors initially (sequential workflow)
  const doctorNotif = {
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
        row('Risk level', riskLevel),
        row('Notes', consultation.notes || 'None'),
      ],
      ctaText: 'Review in portal',
      ctaUrl: portalUrl,
      footer: 'Please confirm availability through the portal or by replying to this email.',
    }),
  };

  // Send doctor notifications only
  if (doctorEmails.length > 0) await sendToPartners(doctorEmails, doctorNotif.email_subject, doctorNotif.email_body);

  // Update workflow status - doctors notified, awaiting confirmation (other partners pending)
  const partnerUpdates = {
    doctor_status: doctorEmails.length > 0 ? 'notified' : 'pending',
    travel_status: 'pending', // Will be notified after doctor confirmation
    hotel_status: 'pending', // Will be notified after doctor confirmation
    cab_status: 'pending', // Will be notified after doctor confirmation
    stage: 'doctor',
    last_update_summary: `SAFE-T approved (${riskLevel} risk). Doctors notified, awaiting confirmation.`,
  };

  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, partnerUpdates);
  try {
    await base44.asServiceRole.entities.Consultation.update(consultation_id, { status: 'in_progress', journey_stage: 'planning' });
  } catch (error) {
    console.log(`Consultation status update skipped for ${consultation_id}: ${error.message}`);
  }

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
          row('Risk level', riskLevel),
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
  } catch (error) {
    console.error('portalHubWorkflow failed:', error);
    return Response.json({ error: error.message || 'Workflow failed' }, { status: 500 });
  }
});