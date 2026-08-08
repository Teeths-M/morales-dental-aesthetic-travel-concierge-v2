import { secrets } from 'base44:runtime';
import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Tool 2: verify_iata_code
// Validates the format of an IATA code (7-8 digits = passenger, 11 = cargo,
// 10 = ID card) then calls the IATA CheckACode API in real time. Returns a
// structured result the M-Care agent narrates conversationally. If the IATA
// credentials are not configured yet, returns status "Error" so the agent
// escalates to a human reviewer instead of guessing.
Deno.serve(createHandler(async ({ body }) => {
    const payload = await body();
    const code = String(payload?.iata_code || '').trim();
    if (!code) return err('iata_code is required');

    const digits = code.replace(/\D/g, '');
    let codeType = null;
    if (/^\d{7}$/.test(digits) || /^\d{8}$/.test(digits)) codeType = 'passenger';
    else if (/^\d{11}$/.test(digits)) codeType = 'cargo';
    else if (/^\d{10}$/.test(digits)) codeType = 'id_card';

    const emptyResult = {
      is_valid: false,
      status: 'Format Invalid',
      code_type: null,
      agency_name: null,
      agency_class: null,
      country: null,
      city: null,
      address: null,
      approval_date: null,
      phone: null,
      raw_response: null,
      note: 'IATA passenger agency codes are 7 or 8 digits, cargo codes are 11 digits, and ID card codes are 10 digits.'
    };
    if (!codeType) return ok(emptyResult);

    const apiKey = secrets.get('IATA_API_KEY');
    const serviceToken = secrets.get('IATA_SERVICE_TOKEN');
    if (!apiKey || !serviceToken) {
      return ok({
        ...emptyResult,
        status: 'Error',
        code_type: codeType,
        note: "IATA API credentials are not configured yet. Tell the agency you're escalating their application to a human reviewer who can finish the IATA check manually."
      });
    }

    const url = `https://globaldata.developer.iata.org/v1/checkacode?code=${encodeURIComponent(code)}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'x-service-token': serviceToken,
        'Accept': 'application/json'
      }
    });

    if (res.status === 429) {
      return ok({
        ...emptyResult,
        status: 'Error',
        code_type: codeType,
        note: 'IATA API rate limit reached. Wait a moment and try the code again.'
      });
    }

    const data = await res.json().catch(() => null);
    const item = Array.isArray(data) ? data[0]
      : data?.result?.[0] || data?.data?.[0] || data?.CheckACodeResult || data;
    const listed = !!(item && (item.name || item.agencyName || item.agency_name || item.Name));

    return ok({
      is_valid: listed,
      status: listed ? 'Valid' : 'Code Not Listed',
      code_type: codeType,
      agency_name: item?.name || item?.Name || item?.agencyName || item?.agency_name || null,
      agency_class: item?.agentClass || item?.AgentClass || item?.agency_class || item?.class || null,
      country: item?.country || item?.Country || item?.countryCode || null,
      city: item?.city || item?.City || null,
      address: item?.address || item?.Address || null,
      approval_date: item?.effectiveDate || item?.EffectiveDate || item?.approval_date || item?.dateOfApproval || null,
      phone: item?.phone || item?.Phone || null,
      raw_response: item || data
    });
}, { name: 'verifyIATACode' }));