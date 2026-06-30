import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * runInternetIntelligence
 *
 * Analyzes a partner's public internet footprint to produce a risk score.
 * Checks: domain age (RDAP), social profile liveness, phone analysis, AI narrative.
 * Stores result back on the partner entity.
 *
 * Risk levels:
 *   low    — score 0–25
 *   medium — score 26–55
 *   high   — score 56+
 */

const VOIP_PREFIXES = ['213', '323', '424', '310', '818', '747', '312', '773', '872', '646', '347', '917'];

const COUNTRY_CODES: Record<string, string[]> = {
  'Trinidad and Tobago':     ['+1868', '+868'],
  'Jamaica':                 ['+1876', '+876'],
  'Barbados':                ['+1246', '+246'],
  'Bahamas':                 ['+1242', '+242'],
  'Saint Lucia':             ['+1758', '+758'],
  'Grenada':                 ['+1473', '+473'],
  'Antigua and Barbuda':     ['+1268', '+268'],
  'Dominican Republic':      ['+1809', '+1829', '+1849'],
  'Mexico':                  ['+52'],
  'Colombia':                ['+57'],
  'Costa Rica':              ['+506'],
  'Panama':                  ['+507'],
  'United States':           ['+1'],
  'Canada':                  ['+1'],
  'United Kingdom':          ['+44'],
  'Spain':                   ['+34'],
  'Portugal':                ['+351'],
  'Brazil':                  ['+55'],
  'India':                   ['+91'],
  'Thailand':                ['+66'],
  'Turkey':                  ['+90'],
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    partner_id,
    partner_type = 'doctor',
    registered_name,
    clinic_name,
    phone,
    city,
    country,
    website_url,
    facebook_handle,
    instagram_handle,
    tiktok_handle,
  } = await body<Record<string, string>>();

  if (!partner_id || !registered_name) {
    return err('partner_id and registered_name are required');
  }

  const signals: Record<string, unknown> = {};
  let riskScore = 0;

  // ── 1. Domain age (RDAP — free, no API key) ──────────────────────────────────
  if (website_url) {
    try {
      const raw = website_url.startsWith('http') ? website_url : `https://${website_url}`;
      const domain = new URL(raw).hostname.replace(/^www\./, '');
      const rdapRes = await fetch(`https://rdap.org/domain/${domain}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (rdapRes.ok) {
        const rdap: any = await rdapRes.json();
        const registered = (rdap.events || []).find((e: any) => e.eventAction === 'registration');
        if (registered?.eventDate) {
          const ageMonths = (Date.now() - new Date(registered.eventDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
          signals.domain_age_months = Math.round(ageMonths);
          signals.domain_registered = registered.eventDate;
          if (ageMonths < 3)       { riskScore += 40; signals.domain_flag = 'very_new'; }
          else if (ageMonths < 6)  { riskScore += 25; signals.domain_flag = 'new'; }
          else if (ageMonths < 12) { riskScore += 10; signals.domain_flag = 'recent'; }
          else                     { riskScore -= 5;  signals.domain_flag = 'established'; }
        }
      }
      signals.website_provided = true;
    } catch (_) {
      signals.domain_check = 'timeout_or_failed';
    }
  } else {
    signals.website_provided = false;
    riskScore += 5;
  }

  // ── 2. Social profile liveness (HEAD checks) ─────────────────────────────────
  const socialChecks: Array<{ platform: string; handle: string | null; status: string }> = [];

  async function checkSocial(url: string, platform: string, handle: string | null) {
    if (!handle) {
      socialChecks.push({ platform, handle: null, status: 'not_provided' });
      riskScore += 8;
      return;
    }
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
      const alive = r.status < 400;
      socialChecks.push({ platform, handle, status: alive ? 'active' : 'not_found' });
      if (alive) riskScore -= 10; else riskScore += 10;
    } catch (_) {
      socialChecks.push({ platform, handle, status: 'check_failed' });
    }
  }

  await checkSocial(`https://www.facebook.com/${facebook_handle}`, 'Facebook', facebook_handle ?? null);
  await checkSocial(`https://www.instagram.com/${instagram_handle}/`, 'Instagram', instagram_handle ?? null);
  await checkSocial(`https://www.tiktok.com/@${tiktok_handle}`, 'TikTok', tiktok_handle ?? null);

  signals.social_checks = socialChecks;

  // ── 3. Phone analysis ────────────────────────────────────────────────────────
  if (phone) {
    const clean = phone.replace(/\D/g, '');
    const hasCode = phone.trimStart().startsWith('+');
    signals.phone_has_country_code = hasCode;
    signals.phone_length_digits = clean.length;

    if (!hasCode && VOIP_PREFIXES.some(p => clean.startsWith(p))) {
      signals.phone_flag = 'possible_voip';
      riskScore += 15;
    }

    if (country && hasCode) {
      const expected = COUNTRY_CODES[country];
      if (expected) {
        const normalized = phone.replace(/[\s\-()]/g, '');
        const match = expected.some(code => normalized.startsWith(code));
        signals.phone_country_match = match;
        if (!match) { signals.phone_flag = 'country_mismatch'; riskScore += 20; }
      }
    }

    if (clean.length < 7 || clean.length > 15) {
      signals.phone_flag = 'invalid_length';
      riskScore += 10;
    }
  } else {
    signals.phone_provided = false;
    riskScore += 10;
  }

  // ── 4. AI Web Intelligence ────────────────────────────────────────────────────
  const prompt = `You are an internet intelligence analyst for a medical tourism safety platform.
Assess the digital credibility and reputation risk of this partner.

Partner:
- Name: ${registered_name}${clinic_name ? `\n- Clinic/Business: ${clinic_name}` : ''}
- City: ${city || 'Unknown'}
- Country: ${country || 'Unknown'}
- Phone: ${phone || 'Not provided'}
- Website: ${website_url || 'None'}
- Facebook: ${facebook_handle || 'None'}
- Instagram: ${instagram_handle || 'None'}
- TikTok: ${tiktok_handle || 'None'}

Assess:
1. Is the combination of location + specialty + digital presence consistent with a legitimate operator in this region?
2. What are the key trust signals or red flags given this profile?
3. Does anything about their contact details, location, or online presence raise concerns?

Return JSON only:
{
  "credibility": "high" | "medium" | "low",
  "key_findings": ["finding 1", "finding 2"],
  "red_flags": ["flag 1"],
  "positive_indicators": ["indicator 1"],
  "narrative": "2-3 sentence plain English risk summary"
}`;

  let ai: any = null;
  try {
    ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          credibility:          { type: 'string' },
          key_findings:         { type: 'array', items: { type: 'string' } },
          red_flags:            { type: 'array', items: { type: 'string' } },
          positive_indicators:  { type: 'array', items: { type: 'string' } },
          narrative:            { type: 'string' },
        },
      },
    });

    signals.ai_credibility = ai.credibility;
    if (ai.credibility === 'low')    riskScore += 30;
    else if (ai.credibility === 'medium') riskScore += 10;
    else if (ai.credibility === 'high')   riskScore -= 15;
    if ((ai.red_flags?.length ?? 0) > 0) riskScore += ai.red_flags.length * 8;
  } catch (_) {
    signals.ai_check = 'failed';
  }

  // ── 5. Zero presence penalty ─────────────────────────────────────────────────
  const noPresence = !website_url && !facebook_handle && !instagram_handle && !tiktok_handle;
  if (noPresence) { riskScore += 20; signals.presence_flag = 'no_internet_presence'; }

  // ── 6. Clamp + classify ──────────────────────────────────────────────────────
  riskScore = Math.max(0, Math.min(100, riskScore));
  const risk_level = riskScore <= 25 ? 'low' : riskScore <= 55 ? 'medium' : 'high';

  const summary = ai?.narrative ?? (
    risk_level === 'low'
      ? `${registered_name} has a consistent digital presence with no significant risk indicators detected.`
      : risk_level === 'medium'
      ? `${registered_name} has a partial digital presence. Some signals are missing but no critical red flags found. Manual review is recommended.`
      : `${registered_name} has limited or inconsistent internet presence. Multiple risk indicators detected. Admin review is required before activation.`
  );

  const result = {
    risk_level,
    risk_score:            riskScore,
    summary,
    signals,
    ai_findings:           ai?.key_findings           ?? [],
    ai_red_flags:          ai?.red_flags              ?? [],
    ai_positive_indicators: ai?.positive_indicators   ?? [],
    checked_at:            new Date().toISOString(),
  };

  // ── 7. Persist to entity ─────────────────────────────────────────────────────
  const patch = {
    internet_risk_level:    risk_level,
    internet_risk_score:    riskScore,
    internet_summary:       summary,
    internet_signals:       signals,
    internet_last_checked:  new Date().toISOString(),
    ...(website_url      ? { website_url }                        : {}),
    ...(facebook_handle  ? { social_facebook: facebook_handle }   : {}),
    ...(instagram_handle ? { social_instagram: instagram_handle } : {}),
    ...(tiktok_handle    ? { social_tiktok: tiktok_handle }       : {}),
  };

  if (partner_type === 'doctor') {
    await base44.asServiceRole.entities.Doctor.update(partner_id, patch).catch(() => {});
  } else if (partner_type === 'travel_agency') {
    await base44.asServiceRole.entities.TravelAgency.update(partner_id, patch).catch(() => {});
  } else if (partner_type === 'taxi') {
    await base44.asServiceRole.entities.TaxiService.update(partner_id, patch).catch(() => {});
  } else if (partner_type === 'security') {
    await base44.asServiceRole.entities.SecurityAgency.update(partner_id, patch).catch(() => {});
  }

  return ok(result);
}, { name: 'runInternetIntelligence', requireAuth: true }));
