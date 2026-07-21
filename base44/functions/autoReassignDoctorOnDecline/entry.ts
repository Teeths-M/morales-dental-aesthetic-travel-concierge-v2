import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// Scores available doctors by procedure match, experience, and location fit
async function aiBestDoctor(doctors: Record<string, unknown>[], procedure: string): Promise<Record<string, unknown>> {
  if (!ANTHROPIC_KEY || doctors.length <= 1) return doctors[0];
  const summary = doctors.slice(0, 10)
    .map((d, i) => `${i}: ${d.full_name} | ${d.clinic_city}, ${d.clinic_country} | ${d.years_experience}yrs exp | ${d.rating}★`)
    .join('\n');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 10, messages: [{ role: 'user', content: `Patient needs: "${procedure}". Which doctor index (0-${Math.min(doctors.length - 1, 9)}) is the best fit? Reply with a single digit only.\n${summary}` }] }),
    });
    if (!r.ok) return doctors[0];
    const d = await r.json();
    const idx = parseInt((d.content?.[0]?.text || '').trim(), 10);
    return (Number.isFinite(idx) && idx >= 0 && idx < doctors.length) ? doctors[idx] : doctors[0];
  } catch { return doctors[0]; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { workflow_id, declined_doctor_id } = await req.json();

    // Get the workflow event
    const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const consultation = await base44.asServiceRole.entities.Consultation.get(workflow.consultation_id);
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Find next available doctor (exclude declined doctor)
    const allDoctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
    const availableDoctors = allDoctors.filter(d => d.id !== declined_doctor_id);

    if (availableDoctors.length === 0) {
      return Response.json({ 
        error: 'No available doctors to assign',
        status: 'needs_admin_intervention'
      }, { status: 400 });
    }

    // AI selects best-fit doctor by procedure match, experience, location, and rating
    const nextDoctor = await aiBestDoctor(availableDoctors, consultation.procedure_interest || '');

    // Update workflow event with new doctor
    await base44.asServiceRole.entities.WorkflowEvent.update(workflow_id, {
      assigned_doctor_id: nextDoctor.id,
      doctor_status: 'pending',
      doctor_notes: `Auto-reassigned on ${new Date().toISOString()} after previous doctor declined`,
      last_update_summary: `Case automatically reassigned to ${nextDoctor.full_name}`,
    });

    // Generate new portal link for the new doctor
    await base44.functions.invoke('generateDoctorPortalLink', {
      workflow_id: workflow_id,
      doctor_id: nextDoctor.id,
      consultation_id: consultation.id,
    });

    // BUG-R7-04 FIX: hardcoded admin email — use ADMIN_EMAIL env var
    // Real patient/procedure/doctor detail stays in the admin dashboard the link opens.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: 'A case was automatically reassigned',
      body: linkOnlyEmail({
        title: 'A case was automatically reassigned to a new doctor',
        line: 'A doctor declined a case and it has been automatically reassigned to the next available match. Open the admin dashboard for the case detail.',
        ctaUrl: `${APP_URL}/admin`,
        ctaLabel: 'Open Admin Dashboard',
        from: 'autoReassignDoctorOnDecline',
      }),
    });

    return Response.json({
      success: true,
      message: 'Case auto-reassigned',
      new_doctor_id: nextDoctor.id,
      new_doctor_name: nextDoctor.full_name
    });
  } catch (error) {
    console.error('[autoReassignDoctorOnDecline]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});