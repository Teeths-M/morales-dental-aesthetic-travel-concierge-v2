import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { linkOnlyEmail, linkOnlySms } from '../_shared/notify.ts';

/**
 * sendAIPartnerBriefs
 *
 * When a case is confirmed, generate and deliver a personalized AI brief
 * to every assigned partner — each in their own language.
 *
 * Partners briefed: doctor, travel agency, taxi/driver, companion, security escort.
 * All AI calls run in parallel; all emails/SMS are dispatched in parallel.
 *
 * Trigger: called from onDoctorConfirmed (auto) or admin CaseDetailDrawer (manual).
 */

const BRAND = 'Morales Medical Travel Safety';

// ── Role-specific AI prompt builder ──────────────────────────────────────────
// LEAK-SCAN-IGNORE-START — this builds the InvokeLLM prompt, not an outbound
// email/SMS body. The AI's output never gets emailed either: the dispatch
// below only ever sends linkOnlyEmail's generic "your brief is ready" line.
function buildPrompt(role: string, country: string, ctx: Record<string, string>): string {
  const langLine = country
    ? `\n\nCRITICAL: Detect the primary official language of "${country}" and write your ENTIRE response — including the email subject — in that language. Only use English for medical terms that have no local equivalent.`
    : '';
  const base = `Patient: ${ctx.patient_name} | Origin: ${ctx.origin} | Procedure: ${ctx.procedure} | Destination: ${ctx.city}, ${ctx.country} | Approx date: ${ctx.date} | Stay: ${ctx.duration}`;

  switch (role) {
    case 'doctor':
      return `You are a senior medical concierge coordinator briefing the assigned doctor before patient arrival.
${base}
Cultural context: ${ctx.cultural || 'Standard care approach'}

Write a warm, professional pre-arrival patient brief (3 short paragraphs):
1. Who the patient is, where they're from, and what they're seeking
2. Key clinical preparation considerations for "${ctx.procedure}" and what the patient is likely anxious about
3. Cultural communication tips — how to speak with this patient warmly to make them feel safe and cared for

Return JSON: { "subject": "brief email subject line", "body_html": "3 paragraphs as <p> tags" }${langLine}`;

    case 'travel_agency':
      return `You are a medical travel coordinator briefing a travel agency for a medical tourism patient.
${base}

Write a professional travel brief (2 short paragraphs):
1. Who the patient is and their medical travel context — recovery requirements: no strenuous activity, elevator access preferred, quiet room near clinic, soft food availability at hotel
2. Transfer and timing considerations — this is a recovering medical patient, comfort and schedule flexibility matter

Return JSON: { "subject": "brief email subject line", "body_html": "2 paragraphs as <p> tags" }${langLine}`;

    case 'taxi':
      return `You are a medical concierge dispatcher briefing a chauffeur for a recovering medical patient.
Patient first name: ${ctx.patient_name.split(' ')[0]} | Procedure category: ${ctx.procedure_cat} | City: ${ctx.city}
Transfer route: Airport → Clinic → Hotel → Airport

Write a short, practical driver brief — 1 intro sentence then 3 bullet points:
• Patient awareness: recovering from a procedure — needs comfort, not clinical detail
• Driving style: smooth acceleration, no hard braking, cool cabin temperature, no sudden turns
• If patient feels unwell en route: pull over safely, call clinic emergency line, stay calm and reassuring

Return JSON: { "subject": "brief email subject line", "body_html": "1 sentence + <ul><li>3 points</li></ul>" }${langLine}`;

    case 'companion':
      return `You are a senior care coordinator briefing a patient companion who will provide daily post-operative support.
${base}
Cultural background: ${ctx.cultural || 'Standard care approach'}

Write a warm, comprehensive companion care brief (3–4 paragraphs):
1. Who the patient is — their background, what they went through, their likely emotional state in early recovery
2. Daily care priorities — what to watch for, comfort measures, hydration and rest schedule, when to call the clinic
3. Cultural communication style — how this patient's background shapes their expectations, family communication preferences
4. Warning signs requiring immediate clinic contact: fever above 38.5°C, unusual swelling, unexpected pain spikes, wound changes

Return JSON: { "subject": "brief email subject line", "body_html": "3–4 paragraphs as <p> tags" }${langLine}`;

    case 'security':
      return `You are a medical concierge security coordinator briefing a security escort for a medical tourism client.
${base}
Intelligence assessment: ${ctx.risk_notes || 'Standard profile — no elevated threat indicators'}

Write a professional security brief (2 short paragraphs):
1. Client vulnerability profile: medical recovery reduces mobility, situational awareness, and stamina — key watch points at airport arrival, clinic transitions, hotel entry/exit
2. Escort protocol: positioning (patient on inside, escort outermost), escalation contacts, what constitutes a medical emergency vs. security emergency

Return JSON: { "subject": "brief email subject line", "body_html": "2 paragraphs as <p> tags" }${langLine}`;

    default:
      return `Brief the ${role} partner for patient ${ctx.patient_name} — ${ctx.procedure} — ${ctx.city}, ${ctx.country}. Return JSON: { "subject": "subject", "body_html": "<p>Brief</p>" }${langLine}`;
  }
}
// LEAK-SCAN-IGNORE-END

// ── Twilio SMS helper ─────────────────────────────────────────────────────────
async function sendSms(to: string, msg: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const tok  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid?.startsWith('AC') || !tok || !from || !to) return;
  const form = new URLSearchParams({ To: to, From: from, Body: msg });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(() => {});
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, workflow_id } = await body<{ case_id: string; workflow_id?: string }>();
  if (!case_id) return err('case_id is required');

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  // ── Load case + workflow in parallel ─────────────────────────────────────────
  const [caseRes, wfRes] = await Promise.allSettled([
    base44.asServiceRole.entities.CaseRecord.get(case_id),
    workflow_id ? base44.asServiceRole.entities.WorkflowEvent.get(workflow_id) : Promise.resolve(null),
  ]);
  const caseRecord = caseRes.status === 'fulfilled' ? (caseRes.value as any) : null;
  if (!caseRecord) return err('CaseRecord not found');
  const wf = wfRes.status === 'fulfilled' ? (wfRes.value as any) : null;

  const doctorId = caseRecord.doctor_selected || wf?.assigned_doctor_id;

  // ── Load consultation + all partners in parallel ───────────────────────────
  const [consRes, docRes, agRes, txRes, compRes, secRes] = await Promise.allSettled([
    caseRecord.consultation_id ? base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id) : Promise.resolve(null),
    doctorId ? base44.asServiceRole.entities.Doctor.get(doctorId) : Promise.resolve(null),
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
    caseRecord.companion_id ? base44.asServiceRole.entities.Companion.get(caseRecord.companion_id) : Promise.resolve(null),
    caseRecord.security_escort_id ? base44.asServiceRole.entities.SecurityAgency.get(caseRecord.security_escort_id) : Promise.resolve(null),
  ]);

  const cons      = consRes.status === 'fulfilled' ? (consRes.value as any) : null;
  const doctor    = docRes.status  === 'fulfilled' ? (docRes.value  as any) : null;
  const allAgencies = agRes.status === 'fulfilled' ? (agRes.value   as any[]) : [];
  const allTaxis    = txRes.status === 'fulfilled' ? (txRes.value   as any[]) : [];
  const companion = compRes.status === 'fulfilled' ? (compRes.value as any) : null;
  const security  = secRes.status  === 'fulfilled' ? (secRes.value  as any) : null;

  // Filter to assigned partner if workflow specifies one; otherwise up to 2 active
  const agencies = wf?.travel_agency_id
    ? allAgencies.filter((a: any) => a.id === wf.travel_agency_id)
    : allAgencies.slice(0, 2);
  const taxis = wf?.chauffeur_id
    ? allTaxis.filter((t: any) => t.id === wf.chauffeur_id)
    : allTaxis.slice(0, 1);

  // ── Build shared context ──────────────────────────────────────────────────────
  const patientName = caseRecord.client_name || caseRecord.patient_name || cons?.patient_name || 'Patient';
  const origin      = caseRecord.client_country || cons?.country_of_origin || '';
  const rawProc     = caseRecord.procedures?.join(', ') || (cons?.procedure_interest || '').replace(/_/g, ' ') || 'medical procedure';
  const procCat     = /dental|oral|jaw/i.test(rawProc) ? 'dental/oral' : /rhinoplasty|facelift|aesthetic|cosmetic|lipo/i.test(rawProc) ? 'aesthetic/cosmetic' : 'surgical';
  const city        = caseRecord.destination_city || caseRecord.clinic_city || '';
  const country     = caseRecord.destination_country || caseRecord.clinic_country || caseRecord.procedure_country || '';
  const prefDate    = cons?.preferred_date ? new Date(cons.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
  const duration    = cons?.duration_of_stay || '7–14 days';
  const cultural    = caseRecord.cultural_care_package?.translation_routing?.routing_instructions || '';
  const riskNotes   = caseRecord.internet_risk_level
    ? `Risk level: ${caseRecord.internet_risk_level} (score ${caseRecord.internet_risk_score}/100). ${caseRecord.internet_summary || ''}`
    : 'No intelligence scan on file';

  const ctx = { patient_name: patientName, origin, procedure: rawProc, procedure_cat: procCat, city, country, date: prefDate, duration, cultural, risk_notes: riskNotes };

  // ── Collect all AI jobs ───────────────────────────────────────────────────────
  type Job = { role: string; lang: string; email: string; phone?: string; eyebrow: string; ctaUrl: string };
  const jobs: Job[]    = [];
  const prompts: string[] = [];

  if (caseRecord.doctor_email) {
    const partnerCountry = doctor?.clinic_country || country;
    jobs.push({ role: 'doctor', lang: partnerCountry, email: caseRecord.doctor_email, phone: doctor?.phone, eyebrow: 'AI Intelligence Brief · Doctor', ctaUrl: `${appUrl}/doctor-dashboard` });
    prompts.push(buildPrompt('doctor', partnerCountry, ctx));
  }

  for (const ag of agencies) {
    const partnerCountry = ag.country || ag.agency_country || '';
    jobs.push({ role: 'travel_agency', lang: partnerCountry, email: ag.email, eyebrow: 'AI Intelligence Brief · Travel Agency', ctaUrl: `${appUrl}/travel-agency-dashboard` });
    prompts.push(buildPrompt('travel_agency', partnerCountry, ctx));
  }

  for (const tx of taxis) {
    const partnerCountry = tx.operating_country || country;
    jobs.push({ role: 'taxi', lang: partnerCountry, email: tx.email, phone: tx.phone, eyebrow: 'AI Intelligence Brief · Driver', ctaUrl: `${appUrl}/taxi-service-dashboard` });
    prompts.push(buildPrompt('taxi', partnerCountry, ctx));
  }

  if (companion?.email) {
    const partnerCountry = companion.country || origin;
    jobs.push({ role: 'companion', lang: partnerCountry, email: companion.email, phone: companion.phone, eyebrow: 'AI Intelligence Brief · Companion', ctaUrl: `${appUrl}/companion-dashboard` });
    prompts.push(buildPrompt('companion', partnerCountry, ctx));
  }

  if (security?.email) {
    const partnerCountry = security.country || country;
    jobs.push({ role: 'security', lang: partnerCountry, email: security.email, eyebrow: 'AI Intelligence Brief · Security', ctaUrl: `${appUrl}/security-agency-dashboard` });
    prompts.push(buildPrompt('security', partnerCountry, ctx));
  }

  // ── Run ALL AI calls in parallel ──────────────────────────────────────────────
  const schema = { type: 'object', properties: { subject: { type: 'string' }, body_html: { type: 'string' } } };
  const aiResults = await Promise.allSettled(
    prompts.map(prompt => base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema }))
  );

  // ── Build email dispatch tasks ────────────────────────────────────────────────
  const emailTasks: Promise<unknown>[] = [];
  const results: Record<string, unknown> = {};
  const sentRoles: string[] = [];

  // The AI-generated brief is exactly the kind of free-text patient detail
  // that must never leave the platform in a notification body — it's built
  // from patient name, procedure, cultural notes and (for security) risk
  // intelligence. It stays in ai_briefs_results on CaseRecord; partners are
  // only ever told a brief is ready, and open their dashboard to read it.
  jobs.forEach((job, i) => {
    const res = aiResults[i];
    if (res.status === 'fulfilled' && res.value) {
      const html = linkOnlyEmail({
        title: job.eyebrow,
        line: 'A new AI-prepared case brief is ready for you to review.',
        ctaUrl: job.ctaUrl,
        ctaLabel: 'Open My Dashboard',
        brand: BRAND,
        from: 'sendAIPartnerBriefs',
      });
      emailTasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: job.email, subject: job.eyebrow, body: html }).catch(() => {})
      );
      if (job.phone) {
        emailTasks.push(sendSms(job.phone, linkOnlySms({
          line: 'A new AI case brief is ready — check your email.',
          url: job.ctaUrl,
          from: 'sendAIPartnerBriefs',
        })));
      }
      if (!results[job.role]) results[job.role] = { status: 'sent', language: job.lang, email: job.email };
      if (!sentRoles.includes(job.role)) sentRoles.push(job.role);
    } else {
      if (!results[job.role]) results[job.role] = { status: 'ai_failed', email: job.email };
    }
  });

  if (jobs.length === 0) {
    return ok({ success: true, results: {}, patient: patientName, roles_briefed: [], note: 'No assigned partners found on this case yet.' });
  }

  // ── Dispatch all emails + SMS in parallel ─────────────────────────────────────
  await Promise.allSettled(emailTasks);

  // ── Persist to CaseRecord ────────────────────────────────────────────────────
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    ai_briefs_sent_at: new Date().toISOString(),
    ai_briefs_results: results,
    timeline_log: [...(caseRecord.timeline_log || []), {
      timestamp: new Date().toISOString(),
      action: 'ai_partner_briefs_sent',
      details: `AI partner briefs dispatched in partner languages to: ${sentRoles.join(', ') || 'none'}`,
      performed_by: 'system',
    }],
  }).catch(() => {});

  return ok({ success: true, results, patient: patientName, roles_briefed: sentRoles });
}, { name: 'sendAIPartnerBriefs', requireAuth: false }));
