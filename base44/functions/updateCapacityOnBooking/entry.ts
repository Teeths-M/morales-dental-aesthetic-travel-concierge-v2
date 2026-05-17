import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Get or create capacity record
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

    // Increment the count
    const newCount = cap.confirmed_count + 1;
    await base44.asServiceRole.entities.MonthlyCapacity.update(cap.id, { confirmed_count: newCount });

    console.log(`Updated capacity for ${yearMonth}: ${cap.confirmed_count} -> ${newCount}`);

    return Response.json({ 
      success: true, 
      year_month: yearMonth,
      updated_count: newCount 
    });
  } catch (error) {
    console.error('Error updating capacity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});