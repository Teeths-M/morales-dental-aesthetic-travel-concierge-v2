import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    let extracted = null;
    try {
    extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract all text and data fields from this passport image. Return the data in JSON format with these fields:
- passport_number: the full passport number
- expiry_date: expiry date in YYYY-MM-DD format
- full_name: full name as shown
- nationality: country of citizenship
- last_4: last 4 characters of passport number

Return null for any field you cannot clearly read. Be accurate.`,
      file_urls: [file_url],
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          passport_number: { type: 'string' },
          expiry_date: { type: 'string' },
          full_name: { type: 'string' },
          nationality: { type: 'string' },
          last_4: { type: 'string' }
        },
        required: ['full_name']
      }
    });
    } catch (_) {}

    if (!extracted) {
      return Response.json({ error: 'Could not read passport — please try with a clearer image.' }, { status: 422 });
    }

    // Basic validation
    const warnings = [];
    if (extracted.expiry_date) {
      const expiry = new Date(extracted.expiry_date);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      if (expiry < new Date()) {
        warnings.push('EXPIRED: This passport has already expired.');
      } else if (expiry < sixMonthsFromNow) {
        warnings.push('WARNING: Passport expires within 6 months — may not meet entry requirements.');
      }
    }

    return Response.json({
      success: true,
      extracted,
      warnings
    });

  } catch (_) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});