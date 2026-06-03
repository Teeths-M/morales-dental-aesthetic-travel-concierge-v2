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

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a passport document scanner. Extract all readable fields from this passport image or document.
      
Return ONLY the extracted data in the exact JSON schema provided. 
- passport_number: the alphanumeric passport number (e.g. A12345678)
- issue_date: issue date in YYYY-MM-DD format
- expiry_date: expiry date in YYYY-MM-DD format
- full_name: full name exactly as printed on passport
- nationality: country of nationality (full name, e.g. "United States")
- date_of_birth: in YYYY-MM-DD format
- gender: M or F
- issuing_country: country that issued the passport
- last_4: last 4 characters of the passport number

If a field cannot be clearly read, return null for that field.
Be precise — do not guess or infer values that are not clearly visible.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          passport_number: { type: 'string' },
          issue_date: { type: 'string' },
          expiry_date: { type: 'string' },
          full_name: { type: 'string' },
          nationality: { type: 'string' },
          date_of_birth: { type: 'string' },
          gender: { type: 'string' },
          issuing_country: { type: 'string' },
          last_4: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          unreadable_fields: { type: 'array', items: { type: 'string' } }
        }
      }
    });

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

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});