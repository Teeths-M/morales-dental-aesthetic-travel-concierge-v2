import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json().catch(() => ({}));
  const { year_month, action, waiting_list_data, consultation_id } = body;

  // ── Helper: get or create capacity record ──────────────────────────────────
  const getCapacity = async (ym) => {
    const existing = await base44.asServiceRole.entities.MonthlyCapacity.filter({ year_month: ym });
    if (existing.length > 0) return existing[0];
    return await base44.asServiceRole.entities.MonthlyCapacity.create({
      year_month: ym,
      capacity_limit: 40,
      confirmed_count: 0,
      scarcity_markup_threshold: 10,
      base_markup_pct: 25,
      scarcity_markup_pct: 35,
    });
  };

  // ── Helper: find next available month ─────────────────────────────────────
  const findNextAvailableMonth = async (startYm) => {
    const [yr, mo] = startYm.split('-').map(Number);
    for (let i = 1; i <= 6; i++) {
      let m = mo + i;
      let y = yr;
      if (m > 12) { m -= 12; y += 1; }
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      const cap = await getCapacity(ym);
      if (cap.confirmed_count < cap.capacity_limit) return { year_month: ym, capacity: cap };
    }
    return null;
  };

  // ── action: check ──────────────────────────────────────────────────────────
  if (action === 'check' || !action) {
    if (!year_month) return Response.json({ error: 'year_month required' }, { status: 400 });

    const cap = await getCapacity(year_month);
    const remaining = cap.capacity_limit - cap.confirmed_count;
    const isFull = remaining <= 0;
    const isNearFull = remaining <= cap.scarcity_markup_threshold;

    // waiting list count
    const waiters = await base44.asServiceRole.entities.WaitingList.filter({
      desired_month: year_month, status: 'waiting',
    });

    // markup
    const activeMarkup = isNearFull ? cap.scarcity_markup_pct : cap.base_markup_pct;

    let nextAvailable = null;
    if (isFull) {
      nextAvailable = await findNextAvailableMonth(year_month);
    }

    return Response.json({
      year_month,
      capacity_limit: cap.capacity_limit,
      confirmed_count: cap.confirmed_count,
      remaining,
      available_slots: remaining,
      is_full: isFull,
      is_near_full: isNearFull,
      waiting_list_count: waiters.length,
      active_markup_pct: activeMarkup,
      next_available_month: nextAvailable?.year_month || null,
      capacity_record_id: cap.id,
    });
  }

  // ── action: get_capacity (for date selector UI) ─────────────────────────────
  if (action === 'get_capacity') {
    if (!year_month) return Response.json({ error: 'year_month required' }, { status: 400 });
    const cap = await getCapacity(year_month);
    const remaining = cap.capacity_limit - cap.confirmed_count;
    return Response.json({
      year_month,
      capacity_limit: cap.capacity_limit,
      confirmed_count: cap.confirmed_count,
      available_slots: remaining,
      is_full: remaining <= 0,
      is_near_full: remaining <= cap.scarcity_markup_threshold
    });
  }

  // ── action: join_waiting_list ─────────────────────────────────────────────
  if (action === 'join_waiting_list') {
    if (!waiting_list_data) return Response.json({ error: 'waiting_list_data required' }, { status: 400 });

    // Check for duplicate
    const existing = await base44.asServiceRole.entities.WaitingList.filter({
      email: waiting_list_data.email,
      desired_month: waiting_list_data.desired_month,
      status: 'waiting',
    });
    if (existing.length > 0) {
      return Response.json({ success: true, already_listed: true, entry: existing[0] });
    }

    const entry = await base44.asServiceRole.entities.WaitingList.create({
      ...waiting_list_data,
      status: 'waiting',
    });

    // Confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: waiting_list_data.email,
      subject: `You're on the Waiting List — ${waiting_list_data.desired_month}`,
      body: `Dear ${waiting_list_data.patient_name},

You have been added to the waiting list for ${waiting_list_data.desired_month}.

We currently have a full capacity for that month, but if a slot opens you will be the first to know. You'll receive an email with a 48-hour window to secure your spot.

Procedure of interest: ${waiting_list_data.procedure_interest || 'Not specified'}

If you have any questions, contact our concierge team directly.

— Morales Dental & Aesthetics Concierge`,
    });

    return Response.json({ success: true, already_listed: false, entry });
  }

  // ── action: confirm_booking (increment count) ─────────────────────────────
  if (action === 'confirm_booking') {
    if (!year_month) return Response.json({ error: 'year_month required' }, { status: 400 });
    const cap = await getCapacity(year_month);
    const newCount = cap.confirmed_count + 1;
    await base44.asServiceRole.entities.MonthlyCapacity.update(cap.id, { confirmed_count: newCount });
    return Response.json({ success: true, confirmed_count: newCount });
  }

  // ── action: cancel_booking (decrement + notify next waiter) ───────────────
  if (action === 'cancel_booking') {
    if (!year_month) return Response.json({ error: 'year_month required' }, { status: 400 });
    const cap = await getCapacity(year_month);
    const newCount = Math.max(0, cap.confirmed_count - 1);
    await base44.asServiceRole.entities.MonthlyCapacity.update(cap.id, { confirmed_count: newCount });

    // Notify next waiter (oldest "waiting" entry for this month)
    const waiters = await base44.asServiceRole.entities.WaitingList.filter({
      desired_month: year_month, status: 'waiting',
    });

    let notified = null;
    if (waiters.length > 0) {
      // Sort by created_date ascending to get oldest first
      const sorted = waiters.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const next = sorted[0];
      const now = new Date();
      const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.WaitingList.update(next.id, {
        status: 'notified',
        notified_at: now.toISOString(),
        offer_expires_at: expires,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: next.email,
        subject: `🎉 A Slot Just Opened for ${year_month} — Act Within 48 Hours`,
        body: `Dear ${next.patient_name},

Great news! A booking slot has just become available for ${year_month}.

You have 48 hours to secure this slot. Please visit the booking page or contact our concierge team immediately to confirm your deposit.

Offer expires: ${new Date(expires).toLocaleString()}

Procedure: ${next.procedure_interest || 'As requested'}

Don't miss this opportunity — slots fill fast!

— Morales Dental & Aesthetics Concierge`,
      });

      notified = { id: next.id, email: next.email, patient_name: next.patient_name };
    }

    return Response.json({ success: true, confirmed_count: newCount, notified_waiter: notified });
  }

  // ── action: get_overview (admin dashboard) ────────────────────────────────
  if (action === 'get_overview') {
    const user = await base44.auth.me();
    // Allow admin and platform_admin roles to access
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build 6-month overview
    const now = new Date();
    const months = [];
    for (let i = -1; i <= 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const capacities = await Promise.all(months.map(getCapacity));
    const waitingListAll = await base44.asServiceRole.entities.WaitingList.list('-created_date', 100);

    const overview = capacities.map((cap, idx) => {
      const ym = months[idx];
      const waiters = waitingListAll.filter(w => w.desired_month === ym);
      const remaining = cap.capacity_limit - cap.confirmed_count;
      const utilization = Math.round((cap.confirmed_count / cap.capacity_limit) * 100);
      return {
        year_month: ym,
        capacity_limit: cap.capacity_limit,
        confirmed_count: cap.confirmed_count,
        remaining,
        utilization_pct: utilization,
        waiting_list_count: waiters.filter(w => w.status === 'waiting').length,
        notified_count: waiters.filter(w => w.status === 'notified').length,
        converted_count: waiters.filter(w => w.status === 'converted').length,
        is_full: remaining <= 0,
        active_markup_pct: remaining <= cap.scarcity_markup_threshold ? cap.scarcity_markup_pct : cap.base_markup_pct,
        record_id: cap.id,
        capacity_limit_editable: cap.capacity_limit,
        scarcity_markup_threshold: cap.scarcity_markup_threshold,
        base_markup_pct: cap.base_markup_pct,
        scarcity_markup_pct: cap.scarcity_markup_pct,
      };
    });

    return Response.json({ overview, waiting_list: waitingListAll });
  }

  // ── action: update_capacity (admin override) ──────────────────────────────
  if (action === 'update_capacity') {
    const user = await base44.auth.me();
    // Only admin and platform_admin can update capacity
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { record_id, updates } = body;
    if (!record_id) return Response.json({ error: 'record_id required' }, { status: 400 });

    await base44.asServiceRole.entities.MonthlyCapacity.update(record_id, updates);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});