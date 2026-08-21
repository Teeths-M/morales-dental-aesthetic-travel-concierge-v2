// ── partnerWebsiteResearch ──────────────────────────────────────────────────
// The real, shared research step behind both researchPartnerWebsite (a
// standalone M-Care tool) and draftPartnerOutreach (which needs the same
// context to write a personalized draft) -- one implementation, two
// callers, same discipline as weatherEngine.ts/findDoctorBackup.ts.
//
// Scoped ONLY to partners already onboarded to Morales -- this never fetches
// an arbitrary caller-supplied URL, only a URL already on file for a real
// Doctor/TravelAgency record (the only two partner types that store one;
// TaxiService/Companion/SecurityAgency have no website field at all today,
// confirmed against each entity's real schema). A real, disclosed
// limitation: this is a plain fetch(), not a headless browser -- a
// JS-rendered (SPA) site's contact info won't be visible here, and the
// result says so honestly rather than reporting a false "found nothing."
//
// Cross-checks the extracted contact info against what's already on file and
// FLAGS a mismatch -- it never overwrites the partner record. Same "AI may
// flag, never resolve" discipline as the registry-fairness fixes elsewhere
// in this codebase.

import { PARTNER_TYPE_CONFIG, partnerDisplayName, type PartnerType } from './partnerTypeConfig.ts';
import { extractContactInfo } from './extractContactInfo.ts';

const WEBSITE_FIELD: Partial<Record<PartnerType, string>> = {
  doctor: 'website_url',
  travel_agency: 'website_url',
};

const FETCH_TIMEOUT_MS = 8000;

export interface PartnerResearchResult {
  found_partner: boolean;
  partner_name: string;
  partner_email: string;
  partner_phone: string;
  partner_whatsapp: string;
  website_url: string | null;
  fetched: boolean;
  fetch_error: string | null;
  page_title: string | null;
  extracted: { emails: string[]; phones: string[]; whatsapp: string[]; addresses: string[] } | null;
  on_file_contact_matches: boolean | null; // null = nothing to compare
  summary: string;
}

function normalizeDigits(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '');
}

export async function researchPartnerWebsiteCore(
  base44: any,
  partner_type: PartnerType,
  partner_id: string,
): Promise<PartnerResearchResult> {
  const cfg = PARTNER_TYPE_CONFIG[partner_type];
  let partner: any = null;
  try {
    partner = await base44.asServiceRole.entities[cfg.entity].get(partner_id);
  } catch (_) {
    partner = null;
  }

  if (!partner) {
    return {
      found_partner: false, partner_name: '', partner_email: '', partner_phone: '', partner_whatsapp: '',
      website_url: null, fetched: false, fetch_error: null, page_title: null, extracted: null,
      on_file_contact_matches: null,
      summary: `No ${cfg.noun} record found for that id.`,
    };
  }

  const partnerName = partnerDisplayName(cfg, partner);
  const partnerEmail = partner.email || '';
  const partnerPhone = partner.phone || '';
  const partnerWhatsapp = partner.whatsapp_number || '';
  const websiteField = WEBSITE_FIELD[partner_type];
  const websiteUrl: string | null = websiteField ? (partner[websiteField] || null) : null;

  if (!websiteUrl) {
    return {
      found_partner: true, partner_name: partnerName, partner_email: partnerEmail, partner_phone: partnerPhone,
      partner_whatsapp: partnerWhatsapp, website_url: null, fetched: false, fetch_error: null, page_title: null,
      extracted: null, on_file_contact_matches: null,
      summary: `No website on file for ${partnerName} -- only the contact info Morales already has for them from onboarding.`,
    };
  }

  let url = websiteUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let html = '';
  let fetchError: string | null = null;
  let pageTitle: string | null = null;

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Morales-MCare/1.0 (+https://morales.com)' },
    });
    html = await res.text();
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    pageTitle = m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  } catch (e: any) {
    fetchError = e?.name === 'AbortError' ? 'The site took too long to respond.' : (e?.message || 'Could not reach that site.');
  }
  clearTimeout(timeout);

  if (fetchError || !html) {
    return {
      found_partner: true, partner_name: partnerName, partner_email: partnerEmail, partner_phone: partnerPhone,
      partner_whatsapp: partnerWhatsapp, website_url: websiteUrl, fetched: false, fetch_error: fetchError || 'Empty response.',
      page_title: null, extracted: null, on_file_contact_matches: null,
      summary: `Couldn't load ${partnerName}'s website (${fetchError || 'empty response'}) -- using the contact info already on file instead.`,
    };
  }

  const extracted = extractContactInfo(html);

  // A near-empty text body after stripping tags is the honest signal of a
  // JS-rendered (SPA) page this plain fetch can't see into -- say so
  // plainly rather than reporting a false "no contact info found."
  const visibleTextLength = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
  const likelyJsRendered = visibleTextLength < 200 && extracted.emails.length === 0 && extracted.phones.length === 0;

  let onFileMatches: boolean | null = null;
  if (!likelyJsRendered && (extracted.emails.length || extracted.phones.length)) {
    const emailMatch = partnerEmail ? extracted.emails.some((e) => e.toLowerCase() === partnerEmail.toLowerCase()) : null;
    const phoneMatch = partnerPhone ? extracted.phones.some((p) => normalizeDigits(p).endsWith(normalizeDigits(partnerPhone).slice(-7))) : null;
    if (emailMatch !== null || phoneMatch !== null) {
      onFileMatches = emailMatch !== false && phoneMatch !== false;
    }
  }

  const summaryParts: string[] = [];
  if (likelyJsRendered) {
    summaryParts.push(`${partnerName}'s site loaded, but the page content is likely JavaScript-rendered -- I can only see the page structure, not the visible text.`);
  } else {
    const found: string[] = [];
    if (extracted.emails.length) found.push(`${extracted.emails.length} email${extracted.emails.length > 1 ? 's' : ''}`);
    if (extracted.phones.length) found.push(`${extracted.phones.length} phone number${extracted.phones.length > 1 ? 's' : ''}`);
    if (extracted.whatsapp.length) found.push('a WhatsApp link');
    summaryParts.push(found.length
      ? `Found ${found.join(', ')} on ${partnerName}'s site (${pageTitle || url}).`
      : `Loaded ${partnerName}'s site (${pageTitle || url}) but found no contact info in the visible text.`);
  }
  if (onFileMatches === false) {
    summaryParts.push('This differs from what Morales has on file for them -- worth confirming before relying on it.');
  } else if (onFileMatches === true) {
    summaryParts.push('This matches what Morales already has on file for them.');
  }

  return {
    found_partner: true,
    partner_name: partnerName,
    partner_email: partnerEmail,
    partner_phone: partnerPhone,
    partner_whatsapp: partnerWhatsapp,
    website_url: websiteUrl,
    fetched: true,
    fetch_error: null,
    page_title: pageTitle,
    extracted: likelyJsRendered ? null : extracted,
    on_file_contact_matches: onFileMatches,
    summary: summaryParts.join(' '),
  };
}
