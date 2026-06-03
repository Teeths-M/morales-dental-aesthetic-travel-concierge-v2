import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();
    
    if (!data || !data.preferred_date) {
      console.log('No preferred_date in consultation data');
      return Response.json({ success: false, error: 'No preferred_date' });
    }

    // Extract year-month from preferred_date
    const yearMonth = data.preferred_date.slice(0, 7); // "2025-05"

    // Get or create capacity record — retry loop for optimistic concurrency
    let finalCount = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await base44.asServiceRole.entities.MonthlyCapacity.filter({ year_month: yearMonth });
      let cap;
      if (existing.length > 0) {
        cap = existing[0];
      } else {
        cap = await base44.asServiceRole.entities.MonthlyCapacity.create({
          year_month: yearMonth,
          capacity_limit: 40,
          confirmed_count: 0,
          scarcity_markup_threshold: 10,
          base_markup_pct: 25,
          scarcity_markup_pct: 35,
        });
      }

      // Capacity guard — do not increment beyond limit
      if (cap.confirmed_count >= cap.capacity_limit) {
        console.warn(`Capacity full for ${yearMonth}: ${cap.confirmed_count}/${cap.capacity_limit}`);
        return Response.json({
          success: false,
          error: 'Month is fully booked',
          year_month: yearMonth,
          confirmed_count: cap.confirmed_count
        }, { status: 409 });
      }

      const newCount = cap.confirmed_count + 1;
      await base44.asServiceRole.entities.MonthlyCapacity.update(cap.id, { confirmed_count: newCount });

      // Optimistic concurrency check: verify the write landed
      const verify = await base44.asServiceRole.entities.MonthlyCapacity.filter({ year_month: yearMonth });
      if (verify[0]?.confirmed_count === newCount) {
        finalCount = newCount;
        console.log(`Updated capacity for ${yearMonth}: ${cap.confirmed_count} -> ${newCount}`);
        break;
      }
      // Another writer raced us — retry
    }

    if (finalCount === null) {
      return Response.json({ success: false, error: 'Capacity update failed after retries' }, { status: 503 });
    }

    return Response.json({
      success: true,
      year_month: yearMonth,
      updated_count: finalCount
    });
  } catch (error) {
    console.error('Error updating capacity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});