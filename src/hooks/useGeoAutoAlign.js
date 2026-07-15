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

// Bump version to force a fresh lookup after the ipinfo.io → ipapi.co fix.
// Old sessions that cached a wrong Venezuela result will be ignored.
const GEO_ALIGNED_KEY = 'geo_auto_aligned_v3';

export function useGeoAutoAlign() {
  useEffect(() => {
    // If already aligned this session, skip to avoid redundant fetches
    if (sessionStorage.getItem(GEO_ALIGNED_KEY)) return;

    const savedCurrency = localStorage.getItem('appCurrency');
    const savedLanguage = localStorage.getItem('appLanguage');

    // If both are already set from user preferences, still fetch for the
    // geoDetected event (so region-specific content can react) but don't override.
    base44.functions.invoke('getGeolocationAndCurrency', {})
      .then(res => {
        const d = res?.data;
        if (!d || d.source === 'default_fallback') return;

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