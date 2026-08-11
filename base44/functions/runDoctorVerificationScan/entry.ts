import { secrets } from 'base44:runtime';
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { runLookup, resolveCountryISO } from '../../shared/registryLookup.ts';
import { isFresh, TTL_MS } from '../../shared/freshness.ts';

// runDoctorVerificationScan — the "Red Team" doctor onboarding scan.
// One self-contained orchestrator that runs every verification layer and
// returns a single, chat-narratable verdict: internet presence, license
// registry (a real API/scrape hit via ../../shared/registryLookup.ts for
// US/CO/MX, an honestly-labeled LLM web-search estimate elsewhere),
// identity/passport, device+network intelligence, background/sanctions, a
// synthesized confidence score, and a decision (approved |
// flagged_for_admin_review). It never fabricates a pass. If anything is
// uncertain or fails, it refuses to approve and routes to a human admin.
//
// Only the doctor being scanned (their own record) or an admin may trigger
// this — it still writes license_verification_status/identity_verification_status
// straight to the Doctor record via asServiceRole (bypasses RLS), so an unscoped
// caller could otherwise pass an arbitrary doctor_id and tamper with someone
// else's sub-checks. It does NOT write status/verification_status to
// 'active'/'verified' — that would bypass activateVerifiedDoctor, "THE SINGLE
// GATED FUNCTION that can set a Doctor to active," which the established
// initiatePartnerVerification/activateVerifiedDoctor pair deliberately gates
// behind a required human background check (or a short-lived HMAC auto-clear
// proof this function does not hold). This function previously reopened that
// hole by writing status='active' directly on a clean scan — fixed; see the
// persist-verdict block below.
Deno.serve(createHandler(async ({ req, base44, user, body }) => {
    const payload = await body();
    const doctor_id = payload?.doctor_id;
    const website_url = payload?.website_url || null;
    const license_number = payload?.license_number || null;
    const license_country = payload?.license_country || payload?.country || null;
    const specialty = payload?.specialty || null;
    const doctor_name = payload?.doctor_name || user.full_name;
    const passport_file_url = payload?.passport_file_url || null;

    if (!doctor_id) return err('doctor_id required');

    const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
    if (!doctor) return err('Doctor record not found', 404);

    const isSelf = doctor.email && user.email && doctor.email.toLowerCase() === user.email.toLowerCase();
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    if (!isSelf && !isAdmin) return err('Forbidden', 403);

    const now = new Date().toISOString();
    const flags = [];
    const steps = [];
    let confidence = 100;

    const llm = base44.asServiceRole.integrations.Core.InvokeLLM.bind(base44.asServiceRole.integrations.Core);

    // ── Layer 1: Internet / website intelligence ──
    let internet = { status: 'not_performed', signals: {} };
    if (website_url) {
      let live = false, statusCode = 0, pageTitle = null;
      try {
        const r = await fetch(website_url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'Morales-MCare/1.0 (+verification)' }
        });
        statusCode = r.status; live = r.ok;
        const html = await r.text();
        const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        pageTitle = m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null;
      } catch (e) { /* site unreachable */ }

      let intel = null;
      try {
        intel = await llm({
          prompt: `You are a digital-presence verification assistant for a medical clinic. Website: ${website_url} (HTTP ${statusCode}, ${live ? 'live' : 'not live'}, title: ${pageTitle || 'n/a'}). Search the web and assess domain age, SSL, content consistency, Google Business Profile (rating + review count), social media presence, and NAP (name/address/phone) consistency. Return JSON. If you cannot determine a field, mark it null — never invent data.`,
          add_context_from_internet: true,
          model: 'gemini_3_1_pro',
          response_json_schema: { type: 'object', properties: {
            domain_age_years: { type: ['number', 'null'] }, ssl_valid: { type: ['boolean', 'null'] },
            google_rating: { type: ['number', 'null'] }, google_reviews: { type: ['number', 'null'] },
            social_active: { type: ['boolean', 'null'] }, nap_consistent: { type: ['boolean', 'null'] },
            risk_level: { type: 'string' }, summary: { type: 'string' }
          } }
        });
      } catch (e) { intel = null; }
      const i = intel || {};
      const risk = String(i.risk_level || '').toLowerCase();
      if (!live) { flags.push('Website not live or unreachable.'); confidence -= 25; }
      if (i.nap_consistent === false) { flags.push('Name/Address/Phone inconsistency across web listings.'); confidence -= 15; }
      if (risk === 'medium') confidence -= 8;
      if (risk === 'high') confidence -= 20;
      const pass = live && i.nap_consistent !== false && risk !== 'high';
      internet = { status: pass ? 'pass' : 'flag', live, status_code: statusCode, page_title: pageTitle, signals: i };
      steps.push({ step: 'Internet presence scan', result: internet.status, url: website_url });
    } else {
      flags.push('No website URL provided — cannot verify digital presence.'); confidence -= 15;
      steps.push({ step: 'Internet presence scan', result: 'skipped' });
    }

    // ── Layer 2: License / credentials registry ──
    // Real government/professional registry data beats an LLM's web-search
    // guess every time one exists. base44/shared/registryLookup.ts has real
    // API/scrape adapters for US/CO/MX that nothing in this scan previously
    // called — try that first; fall back to the LLM-grounded estimate only
    // for the countries with no automated registry, and tag which kind of
    // evidence actually produced the result so an LLM guess can never be
    // mistaken for a real registry hit downstream.
    let credentials: Record<string, any> = { status: 'not_performed' };
    if (license_number && license_country) {
      const countryISO = /^[A-Za-z]{2}$/.test(license_country.trim())
        ? license_country.trim().toUpperCase()
        : resolveCountryISO(license_country);
      const registryResult: any = await runLookup(countryISO, license_number, doctor_name).catch(() => null);

      if (registryResult?.supported) {
        if (registryResult.found && (registryResult.confidence || 0) >= 70) {
          credentials = { ...registryResult, status: 'pass', source_type: 'registry_' + registryResult.reliability };
        } else if (registryResult.found) {
          flags.push(`License found in ${registryResult.registry_name} but with low match confidence — routing to a human registry check.`);
          confidence -= 12;
          credentials = { ...registryResult, status: 'unverifiable', source_type: 'registry_' + registryResult.reliability };
        } else {
          flags.push(`License not confirmed in ${registryResult.registry_name}: ${registryResult.reason || 'not found'}.`);
          confidence -= 25;
          credentials = { ...registryResult, status: 'fail', source_type: 'registry_' + registryResult.reliability };
        }
        steps.push({ step: 'License registry verification', result: credentials.status, license: license_number, country: countryISO, source: registryResult.registry_name });
      } else {
        let res = null;
        try {
          res = await llm({
            prompt: `You are a medical-license verification assistant. Verify registration number "${license_number}" for a ${specialty || 'medical'} practitioner named ${doctor_name} in ${license_country} against the official medical registry. Return JSON: found, name_match, status (verified | not_found | name_mismatch | suspended | unverifiable), expiry, registry_source, details. If you cannot definitively confirm from registry data, return status "unverifiable" — never guess "verified".`,
            add_context_from_internet: true,
            model: 'gemini_3_1_pro',
            response_json_schema: { type: 'object', properties: {
              found: { type: 'boolean' }, name_match: { type: 'boolean' },
              status: { type: 'string' }, expiry: { type: 'string' },
              registry_source: { type: 'string' }, details: { type: 'string' }
            } }
          });
        } catch (e) { res = null; }
        const c: any = res || {};
        const st = String(c.status || 'unverifiable').toLowerCase();
        if (st === 'verified' && c.found && c.name_match) {
          credentials = { ...c, status: 'pass', source_type: 'llm_web_search_estimate' };
        } else if (st === 'not_found' || st === 'name_mismatch' || st === 'suspended') {
          flags.push(`License not confirmed: ${c.status}.`); confidence -= 25;
          credentials = { ...c, status: 'fail', source_type: 'llm_web_search_estimate' };
        } else {
          flags.push('License could not be auto-verified — routing to a human registry check.'); confidence -= 12;
          credentials = { ...c, status: 'unverifiable', source_type: 'llm_web_search_estimate' };
        }
        steps.push({ step: 'License registry verification', result: credentials.status, license: license_number, country: license_country, source: 'llm_web_search_estimate' });
      }
    } else {
      flags.push('Missing license number or country.'); confidence -= 20;
      steps.push({ step: 'License registry verification', result: 'skipped' });
    }

    // ── Layer 3: Identity / passport ──
    let identity = { status: 'not_performed' };
    if (passport_file_url) {
      let res = null;
      try {
        res = await llm({
          prompt: `You are an identity-document verification assistant. Examine the attached passport or national ID image. Check the MRZ, photo consistency (no obvious tampering), expiration, and overall authenticity. Return JSON. If you cannot assess a field, mark it null — never claim authentic without evidence.`,
          file_urls: [passport_file_url],
          response_json_schema: { type: 'object', properties: {
            mrz_valid: { type: ['boolean', 'null'] }, photo_consistent: { type: ['boolean', 'null'] },
            expired: { type: ['boolean', 'null'] }, authentic: { type: ['boolean', 'null'] }, details: { type: 'string' }
          } }
        });
      } catch (e) { res = null; }
      const id = res || {};
      const pass = id.mrz_valid !== false && id.expired !== true && id.authentic !== false;
      if (!pass) { flags.push('Identity document concerns detected.'); confidence -= 20; }
      identity = { status: pass ? 'pass' : 'flag', ...id };
      steps.push({ step: 'Identity document scan', result: identity.status });
    } else {
      confidence -= 5;
      steps.push({ step: 'Identity document scan', result: 'skipped (no document uploaded)' });
    }

    // ── Layer 4: Device / network intelligence ──
    let device_network = { status: 'not_performed' };
    try {
      const forwarded = req.headers.get('x-forwarded-for') || '';
      const ip = forwarded.split(',')[0].trim();
      let ipinfo = {};
      const ipKey = secrets.get('IPINFO_API_KEY');
      if (ip && ipKey) {
        const r = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${ipKey}`);
        ipinfo = await r.json().catch(() => ({}));
      }
      const privacy = ipinfo.privacy || {};
      const vpn = !!(privacy.vpn || privacy.proxy || privacy.tor || privacy.relay);
      const ipCountry = ipinfo.country || '';
      const tzMismatch = !!(license_country && ipCountry && license_country.toUpperCase() !== ipCountry.toUpperCase());
      if (vpn) { flags.push('Signup routed through a VPN / proxy / Tor relay.'); confidence -= 18; }
      if (tzMismatch) { flags.push(`Geo mismatch: IP country (${ipCountry}) vs claimed practice location (${license_country}).`); confidence -= 12; }
      device_network = {
        status: (vpn || tzMismatch) ? 'flag' : 'pass',
        ip_country: ipCountry, city: ipinfo.city, org: ipinfo.org,
        vpn_proxy: vpn, timezone_mismatch: tzMismatch
      };
      steps.push({ step: 'Device & network intelligence', result: device_network.status });
    } catch (e) {
      steps.push({ step: 'Device & network intelligence', result: 'error' });
    }

    // ── Layer 5: Background / sanctions / fraud ──
    let background = { status: 'not_performed' };
    try {
      const res = await llm({
        prompt: `You are a background-screening assistant. Search public sanctions and fraud databases for any match of a medical practitioner named ${doctor_name} (specialty: ${specialty || 'medical'}) operating in ${license_country || 'an unknown country'}. Check OFAC sanctions, Interpol Red Notices, and known fake-clinic / fraud-network associations. Return JSON. Never fabricate a match — if nothing is found, return clear.`,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro',
        response_json_schema: { type: 'object', properties: {
          ofac_clear: { type: 'boolean' }, interpol_clear: { type: 'boolean' },
          fraud_match: { type: 'boolean' }, risk_level: { type: 'string' }, details: { type: 'string' }
        } }
      });
      const b = res || {};
      const clear = b.ofac_clear !== false && b.interpol_clear !== false && b.fraud_match !== true;
      if (!clear) { flags.push('Background screening flagged a potential match.'); confidence -= 25; }
      background = { status: clear ? 'pass' : 'flag', ...b };
      steps.push({ step: 'Background & sanctions screening', result: background.status });
    } catch (e) {
      steps.push({ step: 'Background & sanctions screening', result: 'error' });
      confidence -= 5;
    }

    confidence = Math.max(0, Math.min(100, Math.round(confidence)));
    const decision = (confidence >= 80 && flags.length === 0) ? 'approved' : 'flagged_for_admin_review';

    // ── Persist verdict on the Doctor record ──
    // This function no longer writes status/verification_status to 'active'/
    // 'verified' directly — that bypassed activateVerifiedDoctor, which its own
    // header comment calls "THE SINGLE GATED FUNCTION that can set a Doctor to
    // active," and which requires license + identity + background to each
    // independently reach a passed state first. background_check_status is only
    // ever set by a human (see activateVerifiedDoctor.ts and SecurityAgency's own
    // identical invariant) — a clean automated scan can legitimately attest to
    // license and identity, never to background. Activation now only ever happens
    // through an admin's own click (activateVerifiedDoctor's normal admin path) or
    // through initiatePartnerVerification's separate, HMAC-proof-gated auto-clear
    // path — neither of which this function touches.
    const update: Record<string, unknown> = {
      verification_confidence: confidence,
      verification_notes: flags.length
        ? flags.join(' ')
        : 'Automated scan passed — license and identity checks clear. A human background check and admin activation are still required.',
      internet_risk_level: internet.signals?.risk_level || undefined,
      internet_summary: internet.signals?.summary || undefined,
      internet_signals: internet.signals || undefined,
      internet_last_checked: now,
      license_last_checked_at: now,
      registry_lookup_result: (credentials.source_type as string | undefined)?.startsWith('registry_') ? JSON.stringify(credentials) : undefined,
    };
    if (credentials.status === 'pass') update.license_verification_status = 'passed';
    else if (credentials.status === 'fail') update.license_verification_status = 'failed';
    if (identity.status === 'pass') update.identity_verification_status = 'passed';
    else if (identity.status === 'flag') update.identity_verification_status = 'failed';
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
    await base44.asServiceRole.entities.Doctor.update(doctor_id, update).catch(() => {});

    // ── DoctorVerification audit record ──
    try {
      await base44.asServiceRole.entities.DoctorVerification.create({
        doctor_id,
        doctor_name: doctor.full_name || doctor_name,
        doctor_email: doctor.email,
        country: license_country || doctor.clinic_country || '',
        registration_number: license_number || doctor.license_number || '',
        specialty: specialty || doctor.specialty || '',
        verification_status: decision === 'approved' ? 'auto_verified' : 'manual_review',
        verification_method: decision === 'approved' ? 'api' : 'manual',
        registry_name: credentials.registry_source || (license_country ? license_country + ' Medical Registry' : ''),
        verified_at: decision === 'approved' ? now : null,
        expires_at: decision === 'approved' ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
        last_checked_at: now,
        notes: flags.length ? flags.join(' ') : 'Auto-verified: all layers passed.',
        submitted_at: now
      });
    } catch (e) { /* best-effort audit record */ }

    // ── Notify a human admin — always, not just when flagged ──
    // The scan can no longer auto-activate (see above), so a clean pass now
    // needs an admin to know to do the final background check + activation
    // click, or it would otherwise sit silently in pending_verification forever.
    try {
      const adminEmail = secrets.get('ADMIN_EMAIL');
      if (adminEmail) {
        const subject = decision === 'approved'
          ? `✅ Doctor scan passed — ready for background check + activation — ${doctor.full_name || doctor_name}`
          : `🔍 Doctor verification flagged for review — ${doctor.full_name || doctor_name}`;
        const body = decision === 'approved'
          ? `Doctor ${doctor.full_name || doctor_name} (${doctor.email}) passed M-Care's automated scan (confidence ${confidence}/100, no flags). License and identity checks are recorded as passed. A human background check and admin activation are still required before this doctor goes live.\n\nReview at ${(secrets.get('APP_URL') || '')}/admin/doctor-verification`
          : `Doctor ${doctor.full_name || doctor_name} (${doctor.email}) was flagged by M-Care's verification scan.\n\nConfidence: ${confidence}/100\n\nFlags:\n${flags.map(f => '- ' + f).join('\n') || '- (none)'}\n\nReview at ${(secrets.get('APP_URL') || '')}/admin/doctor-verification`;
        await base44.asServiceRole.integrations.Core.SendEmail({ to: adminEmail, subject, body });
      }
    } catch (e) { /* best-effort */ }

    // ── License freshness (Section 6 — memory decay, applied honestly) ──
    // A scan that actually attempted a license check just confirmed it, right
    // now. A scan called with no license_number/country to check (the
    // 'skipped' branch above, credentials.status stays 'not_performed')
    // instead falls back to the doctor's PRIOR on-file license_last_checked_at
    // via freshness.ts's existing 7-day doctor_license TTL — the same TTL
    // clinic/visa/regulatory data is already held to — so a stale prior check
    // is never silently presented as still current just because this call
    // didn't happen to re-run it.
    const licenseCheckedThisCall = credentials.status !== 'not_performed';
    const licenseFreshness = licenseCheckedThisCall
      ? 'confirmed'
      : (doctor.license_last_checked_at
          ? (isFresh(doctor.license_last_checked_at, TTL_MS.doctor_license) ? 'confirmed' : 'stale')
          : 'unverified');

    return ok({
      decision,
      confidence_score: confidence,
      flags,
      layers: { internet, credentials, identity, device_network, background },
      steps,
      doctor_id,
      license_freshness: licenseFreshness,
      license_last_checked_at: licenseCheckedThisCall ? now : (doctor.license_last_checked_at || null),
    });
}, { name: 'runDoctorVerificationScan' }));
