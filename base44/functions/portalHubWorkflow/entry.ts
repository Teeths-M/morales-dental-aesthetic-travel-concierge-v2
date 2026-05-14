import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: consultation.email,
      subject: 'Important Update Regarding Your Consultation Request — Morales Dental & Aesthetics',
      body: `
Dear ${consultation.patient_name},

Thank you for trusting Morales Dental & Aesthetics with your health journey.

Our SAFE-T 4LIFE™ system has completed a preliminary safety review of your consultation request for: ${consultation.procedure_interest?.replace(/_/g, ' ')}.

Based on the information you provided, our team needs to speak with you directly before proceeding further to ensure your safety and comfort.

${riskAssessment.summary}

${riskAssessment.flags && riskAssessment.flags.length > 0 ? `Areas of attention:\n${riskAssessment.flags.map(f => `• ${f}`).join('\n')}\n` : ''}
A member of our concierge team will reach out within 24 hours to discuss your options and next steps.

Your health and safety are always our first priority.

Warm regards,
The Morales Dental & Aesthetics Concierge Team
      `,
    });

    await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, { customer_notified: true, last_update_summary: 'Patient blocked by SAFE-T risk check. Email notification sent.' });

    return Response.json({
      status: 'blocked',
      message: 'Risk check failed — patient notified by email.',
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

  // notify partners — notify all emails per type
  const sendToPartners = async (emails, subject, body) => {
    for (const email of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body });
    }
  };

  const partnerNotifications = [
    {
      partner: 'doctor',
      email_subject: `New Patient Confirmed — ${consultation.patient_name} | Procedure: ${consultation.procedure_interest?.replace(/_/g, ' ')}`,
      email_body: `
Hello,

Morales Dental & Aesthetics Portal Hub has approved a new patient for scheduling.

Patient: ${consultation.patient_name}
Procedure: ${consultation.procedure_interest?.replace(/_/g, ' ')}
Preferred Date: ${consultation.preferred_date || 'Flexible'}
Risk Level: ${riskAssessment.risk_level}
Notes: ${consultation.notes || 'None'}

Please confirm availability by logging into the portal or replying to this email.

— Morales Concierge Team
      `,
    },
    {
      partner: 'travel',
      email_subject: `Travel Request — ${consultation.patient_name} | ${consultation.preferred_date || 'Flexible Date'}`,
      email_body: `
Hello,

A new patient travel arrangement is needed.

Patient: ${consultation.patient_name}
Nationality: ${consultation.nationality || 'Not specified'}
Preferred Date: ${consultation.preferred_date || 'Flexible'}
Has Companion: ${consultation.has_companion ? `Yes (${consultation.companion_relationship})` : 'No'}
Travel Services Requested: ${(consultation.travel_buddy_services || []).join(', ') || 'Standard'}

Please arrange flights and itinerary and confirm via the portal.

— Morales Concierge Team
      `,
    },
    {
      partner: 'hotel',
      email_subject: `Recovery Lodging Request — ${consultation.patient_name}`,
      email_body: `
Hello,

A recovery lodging arrangement is needed for a patient.

Patient: ${consultation.patient_name}
Procedure: ${consultation.procedure_interest?.replace(/_/g, ' ')}
Preferred Date: ${consultation.preferred_date || 'Flexible'}
Companion: ${consultation.has_companion ? 'Yes' : 'No'}
Cultural/Comfort Preferences: ${(consultation.cultural_preferences || []).join(', ') || 'None specified'}

Please confirm room availability and recovery accommodation details via the portal.

— Morales Concierge Team
      `,
    },
    {
      partner: 'cab',
      email_subject: `Local Transfer Request — ${consultation.patient_name}`,
      email_body: `
Hello,

A local transfer/cab arrangement is needed for an incoming patient.

Patient: ${consultation.patient_name}
Date: ${consultation.preferred_date || 'Flexible'}
Has Companion: ${consultation.has_companion ? 'Yes' : 'No'}
Services: Airport pickup, clinic transfer, hotel return

Please confirm availability via the portal.

— Morales Concierge Team
      `,
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
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: consultation.email,
    subject: '🎉 Your Journey Is Being Planned — Morales Dental & Aesthetics',
    body: `
Dear ${consultation.patient_name},

Great news! Your consultation request has been reviewed and approved by our SAFE-T 4LIFE™ system.

We are now coordinating with our network of trusted partners:
✅ Your specialist clinic — confirming availability
✅ Travel agency — arranging your flights & itinerary
✅ Recovery hotel — securing your comfortable lodging
✅ Local transport — coordinating your transfers

You will receive a detailed update as soon as all arrangements are confirmed, typically within 24-48 hours.

In the meantime, if you have any questions, please don't hesitate to reach out to your personal concierge.

Warm regards,
The Morales Dental & Aesthetics Concierge Team
    `,
  });

  await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, { customer_notified: true });

  return Response.json({
    status: 'approved',
    message: 'Risk approved. All partners notified. Customer email sent.',
    risk: riskAssessment,
    workflow_id: workflow.id,
  });
});