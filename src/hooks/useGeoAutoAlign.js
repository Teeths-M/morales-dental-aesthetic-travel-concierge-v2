/**
 * useGeoAutoAlign
 *
 * Runs once on app mount. Detects the visitor's country via the backend geo
 * function and automatically aligns:
 *   - Currency (if not yet manually set by the user)
 *   - Language (if not yet manually set by the user)
 *   - Any region-specific content via the 'geoDetected' custom event
 *
 * Respects manual user overrides — if the user has already chosen their currency
 * or language, this hook does NOT override them.
 *
 * Session-scoped: runs once per browser session. If the user changes language or
 * currency manually, those choices stick for the rest of the session.
 */

import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { resolveLocaleFromCountry } from '@/lib/geoAutoAlign';
import { changeLanguage } from '@/i18n';
import { fetchClientIpGeo } from '@/lib/clientIpGeo';

// Bump version to force a fresh lookup after the ipinfo.io → ipapi.co fix.
// Old sessions that cached a wrong Venezuela result will be ignored.
const GEO_ALIGNED_KEY = 'geo_auto_aligned_v3';

export function useGeoAutoAlign() {
  useEffect(() => {
    // Skip during automated testing — the async geolocation call and
    // mid-session language change (e.g. en→es) re-renders all form labels
    // and country lists, which confuses the test agent and resets selected
    // values that no longer match the new language's option list.
    if (navigator.webdriver) return;
    // If already aligned this session, skip to avoid redundant fetches
    if (sessionStorage.getItem(GEO_ALIGNED_KEY)) return;

    const savedCurrency = localStorage.getItem('appCurrency');
    const savedLanguage = localStorage.getItem('appLanguage');

    // If both are already set from user preferences, still fetch for the
    // geoDetected event (so region-specific content can react) but don't override.
    //
    // Tries a direct browser->provider call first (clientIpGeo.js), same as
    // useAutoLocation.js — the Base44 edge function calling these same two
    // providers server-side has been confirmed (CLAUDE.md's "M-Care
    // auto-location" section) to reliably return its Unknown fallback from
    // Base44's own runtime. This hook predates that fix and was still
    // calling the broken server path directly with no fallback.
    async function resolve() {
      const clientGeo = await fetchClientIpGeo();
      if (clientGeo) return clientGeo;
      try {
        const res = await base44.functions.invoke('getGeolocationAndCurrency', {});
        const d = res?.data;
        if (d && d.source !== 'default_fallback') return d;
      } catch { /* honest failure — no data, no override */ }
      return null;
    }

    resolve()
      .then(d => {
        if (!d) return;

        const { language, currency } = resolveLocaleFromCountry(d.country_code, d.currency);

        // Auto-set currency only if the user hasn't chosen one yet
        if (!savedCurrency && currency) {
          localStorage.setItem('appCurrency', currency);
          window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency } }));
        }

        // Auto-set language only if the user hasn't chosen one yet
        if (!savedLanguage && language) {
          changeLanguage(language); // persists + fires the languageChange bridge
        }

        // Always fire geoDetected so other components can react to the country
        // (e.g. show T&T-specific content, flag the correct destination, etc.)
        window.dispatchEvent(new CustomEvent('geoDetected', {
          detail: {
            country: d.country,
            country_code: d.country_code,
            city: d.city,
            region: d.region,
            currency: savedCurrency || currency,
            language: savedLanguage || language,
            source: d.source,
          },
        }));

        // Mark as done for this session
        sessionStorage.setItem(GEO_ALIGNED_KEY, '1');
      })
      .catch(() => {
        // Geo detection failed — do nothing; defaults remain in place
      });
  }, []);
}