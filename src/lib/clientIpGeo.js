/**
 * clientIpGeo — direct-from-browser IP geolocation, no Base44 backend involved.
 *
 * Calls ipapi.co then ipwho.is directly from the browser (both already
 * whitelisted in index.html's CSP connect-src, both free/keyless/CORS-
 * enabled). This is the same technique useIpGeolocation.js has used live
 * on Login/Section1PersonalInfo/TravelIntake with no reported issue.
 *
 * It exists as a second, independent path alongside the Base44 edge function
 * getGeolocationAndCurrency, which calls these exact same two providers
 * server-side but has been confirmed (see CLAUDE.md's "MCare auto-location"
 * section, 2026-08-16/17) to reliably return its Unknown fallback in the
 * live environment — most likely a shared/rate-limited Base44 egress IP,
 * unconfirmed. A user's own browser IP isn't subject to whatever that is,
 * so this is tried first wherever a caller wants location and can tolerate
 * a client-side third-party network call.
 *
 * Never throws. Returns the resolved location shape on success, or null if
 * both providers fail — callers decide their own fallback, nothing here is
 * fabricated.
 */

async function fetchWithTimeout(url, ms = 5000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  return res;
}

async function fromIpapiCo() {
  const res = await fetchWithTimeout('https://ipapi.co/json/');
  if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
  const d = await res.json();
  if (d.error || !d.country_code) throw new Error(`ipapi.co bad response: ${d.reason || 'unknown'}`);
  return {
    country: d.country_name || d.country_code,
    country_code: d.country_code,
    city: d.city || null,
    region: d.region || null,
    timezone: d.timezone || null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    currency: d.currency || '',
    source: 'ipapi_co_client',
  };
}

async function fromIpwhoIs() {
  const res = await fetchWithTimeout('https://ipwho.is/');
  if (!res.ok) throw new Error(`ipwho.is ${res.status}`);
  const d = await res.json();
  if (!d.success || !d.country_code) throw new Error('ipwho.is bad response');
  return {
    country: d.country || d.country_code,
    country_code: d.country_code,
    city: d.city || null,
    region: d.region || null,
    timezone: d.timezone?.id || null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    currency: d.currency?.code || '',
    source: 'ipwho_is_client',
  };
}

export async function fetchClientIpGeo() {
  try {
    return await fromIpapiCo();
  } catch {
    try {
      return await fromIpwhoIs();
    } catch {
      return null;
    }
  }
}
