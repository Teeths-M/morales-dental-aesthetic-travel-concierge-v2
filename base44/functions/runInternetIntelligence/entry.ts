import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

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
  'Nigeria':                 ['+234'],
  'Ghana':                   ['+233'],
  'Kenya':                   ['+254'],
  'South Africa':            ['+27'],
  'Philippines':             ['+63'],
  'Guatemala':               ['+502'],
  'Honduras':                ['+504'],
  'El Salvador':             ['+503'],
  'Peru':                    ['+51'],
  'Argentina':               ['+54'],
  'Chile':                   ['+56'],
  'Ecuador':                 ['+593'],
  'Venezuela':               ['+58'],
  'Germany':                 ['+49'],
  'France':                  ['+33'],
  'Italy':                   ['+39'],
  'Australia':               ['+61'],
  'UAE':                     ['+971'],
};

const COUNTRY_ISO: Record<string, string> = {
  'Trinidad and Tobago': 'TT', 'Jamaica': 'JM', 'Barbados': 'BB', 'Bahamas': 'BS',
  'Saint Lucia': 'LC', 'Grenada': 'GD', 'Antigua and Barbuda': 'AG', 'Dominican Republic': 'DO',
  'Mexico': 'MX', 'Colombia': 'CO', 'Costa Rica': 'CR', 'Panama': 'PA',
  'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB', 'Spain': 'ES',
  'Portugal': 'PT', 'Brazil': 'BR', 'India': 'IN', 'Thailand': 'TH',
  'Turkey': 'TR', 'Nigeria': 'NG', 'Ghana': 'GH', 'Kenya': 'KE',
  'South Africa': 'ZA', 'Philippines': 'PH', 'Guatemala': 'GT', 'Honduras': 'HN',
  'El Salvador': 'SV', 'Peru': 'PE', 'Argentina': 'AR', 'Chile': 'CL',
  'Ecuador': 'EC', 'Venezuela': 'VE', 'Germany': 'DE', 'France': 'FR',
  'Italy': 'IT', 'Australia': 'AU', 'UAE': 'AE',
};

const DATACENTER_KW = ['amazon', 'google', 'microsoft', 'digitalocean', 'vultr',
  'linode', 'ovh', 'hetzner', 'cloudflare', 'datacenter', 'colocation', 'hosting'];

Deno.serve(createHandler(async ({ req, base44, user, body }) => {
  const {
    partner_id, partner_type = 'doctor', registered_name, clinic_name,
    phone, city, country, website_url, facebook_handle, instagram_handle,
    tiktok_handle, device_timezone,
  } = await body<Record<string, string>>();

  if (!partner_id || !registered_name) return err('partner_id and registered_name are required');

  const isAdminCaller = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdminCaller) {
    if (partner_type !== 'doctor') return err('Unauthorized', 403);
    const own = await base44.asServiceRole.entities.Doctor.get(partner_id).catch(() => null as any);
    if (!own || own.email !== user?.email) return err('Unauthorized — doctors may only trigger their own scan', 403);
  }

  const signals: Record<string, unknown> = {};
  const agentLog: string[] = [];
  let riskScore = 0;
  let escalated = false; // true when early signals warrant skipping lower-priority checks

  // ── Phase 1: Device fingerprint (fast-path escalation for bots) ──────────────
  const ua = req.headers.get('user-agent') || '';
  const isHeadless = /HeadlessChrome|PhantomJS|Selenium|webdriver/i.test(ua);
  const browserM = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)[\/ ]([\d.]+)/i);
  const osM      = ua.match(/(Windows NT|Mac OS X|Android|iPhone OS|Linux x86_64)/i);
  signals.ua_browser = browserM ? browserM[1] : 'Unknown';
  signals.ua_os      = osM ? osM[1] : 'Unknown';
  signals.device_timezone = device_timezone || null;

  if (isHeadless) {
    signals.ua_flag = 'headless_browser';
    riskScore += 35;
    escalated = true;
    agentLog.push('CRITICAL: Headless browser signature detected — automated signup pattern. Fast-path escalation triggered. Fraud graph runs next; social/domain checks deprioritized.');
  } else {
    agentLog.push(`Device: ${signals.ua_browser} on ${signals.ua_os} — legitimate browser. Proceeding with full scan sequence.`);
  }

  // ── Phase 2: IP intelligence ─────────────────────────────────────────────────
  const signingIp = (req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '').trim();

  if (signingIp && signingIp !== '127.0.0.1' && signingIp !== '::1') {
    try {
      const ipResp = await fetch(`https://ipapi.co/${signingIp}/json/`, { signal: AbortSignal.timeout(4000) });
      if (ipResp.ok) {
        const ipd: any = await ipResp.json();
        if (!ipd.error) {
          const isDatacenter = DATACENTER_KW.some(k => (ipd.org || '').toLowerCase().includes(k));
          signals.ip_label        = isDatacenter ? 'datacenter' : 'residential';
          signals.ip_country      = ipd.country_name || null;
          signals.ip_country_code = ipd.country_code || null;
          signals.ip_city         = ipd.city || null;
          signals.ip_isp          = ipd.org  || null;

          if (isDatacenter) {
            riskScore += 15; signals.ip_flag = 'datacenter'; escalated = true;
            agentLog.push(`IP routes through datacenter (${ipd.org || signingIp}) — VPN or bot infrastructure. Escalating fraud priority.`);
          } else { riskScore -= 5; }

          const expectedISO = country ? COUNTRY_ISO[country] : null;
          if (expectedISO && ipd.country_code && expectedISO !== ipd.country_code) {
            signals.ip_country_mismatch = true;
            signals.ip_flag = (signals.ip_flag ? signals.ip_flag + ' ' : '') + 'country_mismatch';
            riskScore += 15; escalated = true;
            agentLog.push(`IP country mismatch: signing from ${ipd.country_name} but registered as ${country}. Cross-border identity discrepancy. Elevating phone and fraud checks.`);
          } else if (!isDatacenter) {
            agentLog.push(`IP: residential (${ipd.city || signingIp}, ${ipd.country_name}). Location consistent with registered country.`);
          }
        }
      }
    } catch (_) { signals.ip_check = 'timeout'; }
  }

  // ── Phase 3: Phone analysis (determines fraud graph priority) ────────────────
  let phoneEscalated = false;
  if (phone) {
    const clean = phone.replace(/\D/g, '');
    const hasCode = phone.trimStart().startsWith('+');
    signals.phone_has_country_code = hasCode;
    signals.phone_length_digits    = clean.length;

    if (!hasCode && VOIP_PREFIXES.some(p => clean.startsWith(p))) {
      signals.phone_flag = 'possible_voip'; riskScore += 15;
      phoneEscalated = true; escalated = true;
      agentLog.push(`Phone prefix ${clean.substring(0, 3)} matches VoIP pattern — synthetic identity signal. Fraud graph escalated: runs before domain/social checks.`);
    }

    if (country && hasCode) {
      const expected = COUNTRY_CODES[country];
      if (expected) {
        const normalized = phone.replace(/[\s\-()]/g, '');
        const match = expected.some(code => normalized.startsWith(code));
        signals.phone_country_match = match;
        if (!match) {
          signals.phone_flag = 'country_mismatch'; riskScore += 20;
          phoneEscalated = true; escalated = true;
          agentLog.push(`Phone country code does not match registered country (${country}). Cross-border mismatch — fraud graph escalated.`);
        }
      }
    }

    if (clean.length < 7 || clean.length > 15) { signals.phone_flag = 'invalid_length'; riskScore += 10; }
    if (!phoneEscalated) agentLog.push('Phone: no immediate flags. Standard weighting applied.');
  } else {
    signals.phone_provided = false; riskScore += 10;
    agentLog.push('No phone provided. Absence noted as risk signal.');
  }

  // ── Phase 4: Fraud graph cross-reference (escalated or standard) ─────────────
  if (phone) {
    agentLog.push(escalated
      ? 'Fraud graph [ESCALATED]: cross-referencing phone across all 4 partner entity types now — ahead of domain/social.'
      : 'Fraud graph: standard cross-reference pass.');
    try {
      const allEntities = ['Doctor', 'TravelAgency', 'TaxiService', 'SecurityAgency'];
      let sharedCount = 0;
      await Promise.allSettled(allEntities.map(async (ent) => {
        const hits = await (base44.asServiceRole.entities as any)[ent]
          .filter({ phone }, '-created_date', 10).catch(() => []);
        sharedCount += (hits as any[]).filter((r: any) => r.id !== partner_id).length;
      }));
      if (sharedCount > 0) {
        signals.phone_shared_partners = sharedCount;
        signals.phone_flag = 'shared_across_partners';
        riskScore += Math.min(sharedCount * 20, 40);
        agentLog.push(`CRITICAL: Fraud graph hit — phone shared across ${sharedCount} existing partner record(s). High-confidence synthetic identity pattern confirmed.`);
      } else {
        agentLog.push('Fraud graph: no cross-partner matches. Phone number is unique to this application.');
      }
    } catch (_) { /* non-fatal */ }
  }

  // ── Phase 5: Domain + social (skip if already critical, run in parallel) ──────
  const socialChecks: Array<{ platform: string; handle: string | null; status: string }> = [];
  const alreadyCritical = riskScore >= 70;

  if (alreadyCritical) {
    agentLog.push(`Risk score ${riskScore}/100 — critical threshold reached. Domain and social checks bypassed. Proceeding directly to AI synthesis with current signal set.`);
    signals.website_provided = !!website_url;
    if (!website_url) riskScore += 5;
  } else {
    // Domain (RDAP)
    if (website_url) {
      try {
        const raw = website_url.startsWith('http') ? website_url : `https://${website_url}`;
        const domain = new URL(raw).hostname.replace(/^www\./, '');
        const [rdapOut, liveOut] = await Promise.allSettled([
          fetch(`https://rdap.org/domain/${domain}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }),
          fetch(raw, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) }),
        ]);
        if (rdapOut.status === 'fulfilled' && rdapOut.value.ok) {
          const rdap: any = await rdapOut.value.json();
          const registered = (rdap.events || []).find((e: any) => e.eventAction === 'registration');
          if (registered?.eventDate) {
            const ageMonths = (Date.now() - new Date(registered.eventDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
            signals.domain_age_months = Math.round(ageMonths);
            signals.domain_registered = registered.eventDate;
            if (ageMonths < 3)       { riskScore += 40; signals.domain_flag = 'very_new'; }
            else if (ageMonths < 6)  { riskScore += 25; signals.domain_flag = 'new'; }
            else if (ageMonths < 12) { riskScore += 10; signals.domain_flag = 'recent'; }
            else                     { riskScore -= 5;  signals.domain_flag = 'established'; }
            agentLog.push(`Domain: ${signals.domain_age_months}mo old (${signals.domain_flag}). ${ageMonths < 6 ? 'New domain is inconsistent with claimed practice history.' : 'Established domain — positive credibility signal.'}`);
          }
        } else { signals.domain_check = 'rdap_failed'; }
        if (liveOut.status === 'fulfilled') {
          signals.website_live = liveOut.value.status < 400;
          if (!signals.website_live) { riskScore += 15; signals.website_flag = 'not_loading'; }
        } else { signals.website_live = false; signals.website_flag = 'unreachable'; riskScore += 10; }
        signals.website_provided = true;
      } catch (_) { signals.domain_check = 'error'; }
    } else { signals.website_provided = false; riskScore += 5; }

    // Social probes
    async function checkSocial(url: string, platform: string, handle: string | null) {
      if (!handle) { socialChecks.push({ platform, handle: null, status: 'not_provided' }); riskScore += 8; return; }
      try {
        const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
        const alive = r.status < 400;
        socialChecks.push({ platform, handle, status: alive ? 'active' : 'not_found' });
        if (alive) riskScore -= 10; else riskScore += 10;
      } catch (_) { socialChecks.push({ platform, handle, status: 'check_failed' }); }
    }
    await Promise.allSettled([
      checkSocial(`https://www.facebook.com/${facebook_handle}`, 'Facebook', facebook_handle ?? null),
      checkSocial(`https://www.instagram.com/${instagram_handle}/`, 'Instagram', instagram_handle ?? null),
      checkSocial(`https://www.tiktok.com/@${tiktok_handle}`, 'TikTok', tiktok_handle ?? null),
    ]);
    const activeCount = socialChecks.filter(s => s.status === 'active').length;
    agentLog.push(`Social presence: ${activeCount}/3 platforms verified live. ${activeCount === 0 ? 'Zero social presence detected.' : activeCount < 2 ? 'Partial presence.' : 'Strong social footprint.'}`);
  }

  signals.social_checks = socialChecks;
  if (!website_url && !facebook_handle && !instagram_handle && !tiktok_handle) {
    riskScore += 20; signals.presence_flag = 'no_internet_presence';
  }

  // ── Phase 6: AI synthesis (with full agent reasoning context) ────────────────
  riskScore = Math.max(0, Math.min(100, riskScore));

  agentLog.push(`Agent synthesis: ${agentLog.filter(l => l.startsWith('CRITICAL')).length} critical signal(s) detected. Pre-synthesis risk score: ${riskScore}/100. Invoking AI narrative layer.`);

  // Sanitized copies for the prompt only — the raw values are used for the
  // deterministic signal logic (COUNTRY_ISO/COUNTRY_CODES lookups) above.
  const rnP = sanitizePromptInput(registered_name, 120).text;
  const cnP = sanitizePromptInput(clinic_name || '', 120).text;
  const cityP = sanitizePromptInput(city || '', 80).text;
  const countryP = sanitizePromptInput(country || '', 80).text;

  const prompt = `You are an internet intelligence analyst for a medical tourism safety platform.

Partner application:
- Name: ${rnP}${cnP ? `\n- Clinic: ${cnP}` : ''}
- City: ${cityP || 'Unknown'}, Country: ${countryP || 'Unknown'}
- Phone: ${phone || 'Not provided'}, Website: ${website_url || 'None'}
- Facebook: ${facebook_handle || 'None'}, Instagram: ${instagram_handle || 'None'}, TikTok: ${tiktok_handle || 'None'}

Agent investigation trace (what the AI agent already found):
${agentLog.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Based on this investigation trace and the partner profile above:
1. Assess overall digital credibility given what the agent found
2. Identify any additional red flags or trust signals
3. Search Google Business for "${clinic_name || registered_name}" in "${city || ''}, ${country || ''}": verified listing? Star rating? Review count? One short review quote?
4. Write a 2-3 sentence plain-English risk summary that references the agent's key findings

Return JSON only:
{
  "credibility": "high" | "medium" | "low",
  "key_findings": ["finding"],
  "red_flags": ["flag"],
  "positive_indicators": ["indicator"],
  "narrative": "2-3 sentence summary referencing agent findings",
  "google": { "status": "verified"|"unverified"|"not_found", "rating": null|number, "review_count": null|number, "snippet": null|string }
}`;

  let ai: any = null;
  try {
    ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          credibility:         { type: 'string' },
          key_findings:        { type: 'array', items: { type: 'string' } },
          red_flags:           { type: 'array', items: { type: 'string' } },
          positive_indicators: { type: 'array', items: { type: 'string' } },
          narrative:           { type: 'string' },
          google: { type: 'object', properties: { status: { type: 'string' }, rating: { type: 'number' }, review_count: { type: 'number' }, snippet: { type: 'string' } } },
        },
      },
    });
    signals.ai_credibility = ai.credibility;
    signals.google = ai.google ?? null;
    // HARDENED (safety-decision architecture): the AI may only ADD risk — it can
    // raise caution but can never lower a risk value or make a partner look safer.
    // Only deterministic signals (residential IP, established domain, live socials)
    // are allowed to reduce the score. This keeps the AI from clearing anything.
    if (ai.credibility === 'low')    riskScore += 30;
    else if (ai.credibility === 'medium') riskScore += 10;
    // 'high' credibility no longer subtracts — deterministic checks handle trust.
    if ((ai.red_flags?.length ?? 0) > 0) riskScore += ai.red_flags.length * 8;
    if (ai.google?.status === 'not_found') riskScore += 10;
    // a 'verified' Google listing no longer subtracts via the AI path.
  } catch (_) { signals.ai_check = 'failed'; }

  // ── Finalize ─────────────────────────────────────────────────────────────────
  riskScore = Math.max(0, Math.min(100, riskScore));
  const risk_level = riskScore <= 25 ? 'low' : riskScore <= 55 ? 'medium' : 'high';
  const xai_confidence = Math.max(5, 100 - riskScore);

  const summary = ai?.narrative ?? (
    risk_level === 'low'    ? `${registered_name} has a consistent digital presence with no significant risk indicators.` :
    risk_level === 'medium' ? `${registered_name} has a partial digital presence. Some signals missing but no critical red flags. Manual review recommended.` :
                              `${registered_name} has limited or inconsistent internet presence. Multiple risk indicators detected. Admin review required.`
  );

  const xai_flags: string[] = [
    ...(signals.ua_flag === 'headless_browser'                    ? ['Headless browser signature — automated signup bot']                                              : []),
    ...(signals.ip_flag?.includes('datacenter')                   ? [`Signup IP routes through datacenter (${signals.ip_isp || signals.ip_city})`]                   : []),
    ...(signals.ip_country_mismatch                               ? [`IP location (${signals.ip_country}) does not match registered country (${country})`]            : []),
    ...((signals.phone_shared_partners as number) > 0             ? [`Phone shared with ${signals.phone_shared_partners} other partner application(s)`]               : []),
    ...(signals.phone_flag === 'possible_voip'                    ? ['Phone number resolves to VoIP — associated with synthetic identities']                          : []),
    ...(signals.phone_flag === 'country_mismatch'                 ? ['Phone country code does not match registered country']                                          : []),
    ...((signals.domain_flag === 'very_new' || signals.domain_flag === 'new')
                                                                  ? [`Domain registered only ${signals.domain_age_months}mo ago — inconsistent with claimed history`] : []),
    ...(ai?.red_flags ?? []),
  ];

  const xai_positives: string[] = [
    ...(signals.ip_label === 'residential'       ? [`Signup IP is residential (${signals.ip_isp || signals.ip_city || 'clean ISP'})`]                      : []),
    ...(signals.domain_flag === 'established'    ? [`Website domain established ${signals.domain_age_months}mo ago`]                                       : []),
    ...(signals.website_live                     ? ['Website is live and reachable']                                                                       : []),
    ...(((signals.social_checks as any[]) ?? []).filter((s: any) => s.status === 'active').map((s: any) => `${s.platform} profile verified active`)),
    ...(ai?.positive_indicators ?? []),
  ];

  signals.xai_confidence = xai_confidence;
  signals.xai_flags      = xai_flags;
  signals.xai_positives  = xai_positives;

  const result = {
    risk_level, risk_score: riskScore, xai_confidence,
    xai_flags, xai_positives, summary, signals,
    ai_findings:            ai?.key_findings          ?? [],
    ai_red_flags:           ai?.red_flags             ?? [],
    ai_positive_indicators: ai?.positive_indicators   ?? [],
    agent_reasoning:        agentLog,
    checked_at:             new Date().toISOString(),
  };

  // ── Persist ──────────────────────────────────────────────────────────────────
  const patch = {
    internet_risk_level:   risk_level,
    internet_risk_score:   riskScore,
    internet_summary:      summary,
    internet_signals:      signals,
    internet_last_checked: new Date().toISOString(),
    ...(website_url      ? { website_url }                        : {}),
    ...(facebook_handle  ? { social_facebook: facebook_handle }   : {}),
    ...(instagram_handle ? { social_instagram: instagram_handle } : {}),
    ...(tiktok_handle    ? { social_tiktok: tiktok_handle }       : {}),
  };

  if (partner_type === 'doctor')         await base44.asServiceRole.entities.Doctor.update(partner_id, patch).catch(() => {});
  else if (partner_type === 'travel_agency') await base44.asServiceRole.entities.TravelAgency.update(partner_id, patch).catch(() => {});
  else if (partner_type === 'taxi')      await base44.asServiceRole.entities.TaxiService.update(partner_id, patch).catch(() => {});
  else if (partner_type === 'security')  await base44.asServiceRole.entities.SecurityAgency.update(partner_id, patch).catch(() => {});

  // ── HIGH risk admin alert ────────────────────────────────────────────────────
  if (risk_level === 'high') {
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `🚨 HIGH RISK Partner Flagged — ${registered_name}`,
        body: `<h2>Internet Intelligence Alert</h2>
<p><strong>Partner:</strong> ${registered_name}${clinic_name ? ` (${clinic_name})` : ''}</p>
<p><strong>Location:</strong> ${city || '—'}, ${country || '—'}</p>
<p><strong>Risk Score:</strong> ${riskScore}/100 — HIGH RISK</p>
<p><strong>AI Summary:</strong> ${summary}</p>
<p><strong>Agent Reasoning:</strong><ol>${agentLog.map(l => `<li>${l}</li>`).join('')}</ol></p>
${(ai?.red_flags?.length ?? 0) > 0 ? `<p><strong>Flags:</strong><ul>${ai.red_flags.map((f: string) => `<li>${f}</li>`).join('')}</ul></p>` : ''}
<p>This application has been held automatically. Review in the Admin Partner Hub.</p>`,
      }).catch(() => {});
    }
  }

  return ok(result);
}, { name: 'runInternetIntelligence', requireAuth: true }));
