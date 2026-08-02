import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

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
    
    const { event, data } = await req.json();
    
    if (!data || !data.preferred_date) {
      console.log('No preferred_date in consultation data');
      return Response.json({ success: false, error: 'No preferred_date' });
    }

    // Extract year-month from preferred_date
    const yearMonth = data.preferred_date.slice(0, 7); // "2025-05"

    // Get or create the capacity record (not contended — capacity_limit is admin-set
    // and rarely changes; confirmed_count is the field under real concurrent load).
    const existing = await base44.asServiceRole.entities.MonthlyCapacity.filter({ year_month: yearMonth });
    const cap = existing.length > 0 ? existing[0] : await base44.asServiceRole.entities.MonthlyCapacity.create({
      year_month: yearMonth,
      capacity_limit: 40,
      confirmed_count: 0,
      scarcity_markup_threshold: 10,
      base_markup_pct: 25,
      scarcity_markup_pct: 35,
    });

    // ATOMIC conditional increment — see capacityCheck/entry.ts confirm_booking for the
    // full rationale. The previous "read, write, re-read to verify" loop here was not a
    // real compare-and-swap: two simultaneous webhook calls could both read the same
    // pre-increment count, both write the same newCount, and both believe they succeeded,
    // silently overbooking the month. updateMany's $lt condition + $inc are evaluated
    // atomically per document by the database, closing that race.
    const result = await base44.asServiceRole.entities.MonthlyCapacity.updateMany(
      { year_month: yearMonth, confirmed_count: { $lt: cap.capacity_limit } },
      { $inc: { confirmed_count: 1 } }
    );

    if (!result?.updated) {
      console.warn(`Capacity full for ${yearMonth}: ${cap.confirmed_count}/${cap.capacity_limit}`);
      return Response.json({
        success: false,
        error: 'Month is fully booked',
        year_month: yearMonth,
        confirmed_count: cap.confirmed_count
      }, { status: 409 });
    }

    const updatedCap = await base44.asServiceRole.entities.MonthlyCapacity.filter({ year_month: yearMonth });
    const finalCount = updatedCap[0]?.confirmed_count ?? cap.confirmed_count + 1;
    console.log(`Updated capacity for ${yearMonth}: -> ${finalCount}`);

    return Response.json({
      success: true,
      year_month: yearMonth,
      updated_count: finalCount
    });
  } catch (error) {
    // BUG-R12-01 FIX: SEC-10
    console.error('[updateCapacityOnBooking]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});