import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all master procedures
    const masterProcs = await base44.asServiceRole.entities.MasterProcedure.list();

    if (masterProcs.length === 0) {
      return Response.json({ error: 'No master procedures found.' }, { status: 400 });
    }

    const results = [];

    // Create ProcedurePricing for each master procedure
    for (const proc of masterProcs) {
      const pricing = await base44.asServiceRole.entities.ProcedurePricing.create({
        procedure_name: proc.en_name,
        category: proc.category,
        subcategory: proc.category,
        base_price_usd: 2500 + Math.random() * 5000, // Random price between 2500-7500
        min_price_usd: 2000 + Math.random() * 3000,
        max_price_usd: 5000 + Math.random() * 8000,
        complexity_level: 'moderate',
        estimated_time_minutes: 60,
        recovery_days: 7,
        is_active: true
      });
      
      results.push({
        master_procedure_id: proc.id,
        procedure_name: proc.en_name,
        pricing_id: pricing.id,
        base_price: pricing.base_price_usd
      });
    }

    return Response.json({ 
      status: 'success',
      message: `Seeded ${results.length} procedure pricing records`,
      results 
    });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});