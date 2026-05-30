import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7); // "2026-05"
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }); // "May 2026"

    // Fetch MonthlyCapacity record for current month
    const capacityRecords = await base44.entities.MonthlyCapacity.filter({ year_month: yearMonth });
    
    let maxSlots = 40; // Default fallback
    let activeBookings = 0;

    if (capacityRecords && capacityRecords.length > 0) {
      const capacity = capacityRecords[0];
      maxSlots = capacity.capacity_limit || 40;
      activeBookings = capacity.confirmed_count || 0;
    }

    const slotsRemaining = maxSlots - activeBookings;

    return Response.json({
      maxSlots,
      activeBookings,
      slotsRemaining,
      monthName,
      yearMonth,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});