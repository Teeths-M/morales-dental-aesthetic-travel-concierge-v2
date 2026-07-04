import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

async function aiProposalNarrative(params: {
  name: string; procedures: unknown; destination: string;
  totalDays: number; finalPrice: number;
}): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  const procs = Array.isArray(params.procedures) ? params.procedures.join(' + ') : String(params.procedures || 'procedure');
  const prompt = `You are the senior concierge at Morales Medical Travel. Write ONE compelling paragraph (max 55 words) for ${params.name}'s personalized proposal. Package: ${procs} in ${params.destination || 'destination'}, ${params.totalDays}-day stay, all-inclusive at $${Math.round(params.finalPrice).toLocaleString()}. Warm but professional tone. No bullet points.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseId } = await req.json();
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

    // BUG-R7-03 FIX: entity is named CaseRecord, not Case — wrong name caused EntityNotFound on
    // every call, returning 500 for every patient proposal view.
    // BUG-R7-01 FIX: also switch to asServiceRole — user-scoped read fails for non-owning users
    // (e.g. admins previewing a patient proposal, or the patient seeing their own full breakdown
    // after the case was created by an admin import flow).
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Authorization: patient can view their own case; admins can view any
    if (caseRecord.client_email !== user.email && user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const baseCost = (caseRecord.treatment_cost || 0) +
                     (caseRecord.flight_cost || 0) +
                     (caseRecord.hotel_cost || 0) +
                     (caseRecord.pickup_cost || 0) +
                     (caseRecord.dropoff_cost || 0) +
                     (caseRecord.local_transfer_cost || 0);

    // markup_percentage stored as decimal (0.3) or integer (30) — normalise both forms
    const markupPct = (caseRecord.markup_percentage || 30) > 1
      ? caseRecord.markup_percentage
      : (caseRecord.markup_percentage || 0.3) * 100;
    const markupMultiplier = 1 + markupPct / 100;
    const finalPackagePrice = baseCost * markupMultiplier;
    const profit = finalPackagePrice - baseCost;

    const deposit25 = finalPackagePrice * 0.25;
    const deposit50 = finalPackagePrice * 0.50;

    // AI narrative: a personalized compelling paragraph for the proposal page
    const narrative = await aiProposalNarrative({
      name: caseRecord.client_name || 'Valued Patient',
      procedures: caseRecord.procedures,
      destination: caseRecord.procedure_country || caseRecord.destination_city || '',
      totalDays: (caseRecord.treatment_duration || 0) + (caseRecord.recovery_days || 0),
      finalPrice: finalPackagePrice,
    });

    return Response.json({
      case_id: caseId,
      client_name: caseRecord.client_name,
      procedures: caseRecord.procedures,
      cost_breakdown: {
        treatment: caseRecord.treatment_cost || 0,
        flights: caseRecord.flight_cost || 0,
        hotel: caseRecord.hotel_cost || 0,
        origin_transfer: (caseRecord.pickup_cost || 0) + (caseRecord.dropoff_cost || 0),
        destination_transfer: caseRecord.local_transfer_cost || 0,
        base_cost: baseCost,
        markup_percentage: markupPct,
        final_package_price: finalPackagePrice,
        profit: profit
      },
      payment_options: {
        full_payment: finalPackagePrice,
        deposit_25_percent: deposit25,
        deposit_50_percent: deposit50,
        balance_due_later: {
          with_25_deposit: finalPackagePrice - deposit25,
          with_50_deposit: finalPackagePrice - deposit50
        }
      },
      treatment_details: {
        duration_days: caseRecord.treatment_duration,
        recovery_days: caseRecord.recovery_days,
        total_stay_days: (caseRecord.treatment_duration || 0) + (caseRecord.recovery_days || 0)
      },
      narrative,
    });

  } catch (error) {
    console.error('[generateClientProposal]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});