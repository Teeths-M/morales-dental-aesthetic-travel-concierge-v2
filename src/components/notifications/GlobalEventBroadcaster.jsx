import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNotification } from '@/context/NotificationContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';
import { isSystemPaused } from '@/lib/systemPause';

const DRIVER_ETA_POLL_MS = 45 * 1000;
const COUNTRY_STORAGE_KEY = 'morales_last_notified_country';
const ADVENTURE_STORAGE_KEY = 'morales_adventure_prompted';
const EVENING_STORAGE_KEY = 'morales_evening_prompted';

/**
 * GlobalEventBroadcaster
 *
 * Sits silently in AppLayout and fires global notifications for:
 *  1. Country arrival (GPS → new country detected)
 *  2. Driver ETA (active trip in transit phase)
 *  3. Handshake step progression
 *  4. Daily greeting on first load
 *
 * Props: user — auth user object
 */
export default function GlobalEventBroadcaster({ user }) {
  const { showNotification } = useNotification();
  const greetedRef     = useRef(false);
  const lastEtaRef     = useRef(null);

  // ── 1. Active trip (for driver ETA + handshake events) ───────────────────
  const { data: activeTrip } = useQuery({
    queryKey: ['global-active-trip', user?.email],
    queryFn: async () => {
      const trips = await base44.entities.TravelRequest.filter({ user_email: user.email });
      return trips.find(t =>
        ['pre_departure', 'transit_out', 'arrived', 'recovery', 'transit_return'].includes(t.trip_phase)
      ) ?? null;
    },
    enabled: !!user?.email,
    staleTime: 60_000,
    refetchInterval: DRIVER_ETA_POLL_MS,
  });

  // ── 2. Live GPS for country detection ────────────────────────────────────
  const hasActiveTrip = !!activeTrip;
  const { currentLocation } = useLiveLocationBeacon({
    caseId:     activeTrip?.case_id,
    caseStatus: activeTrip?.status,
    enabled:    hasActiveTrip,
  });

  const { country, flag, isNewCountry, acknowledgeCountry } = useCountryDetection({
    lat:     currentLocation?.lat,
    lng:     currentLocation?.lng,
    enabled: hasActiveTrip,
  });

  // ── MedGuard™ Activation — fires once when patient enters active travel ────
  // This is the moment the patient knows they are protected. One shot, session only.
  const medguardActivatedRef = useRef(false);
  useEffect(() => {
    if (!activeTrip || medguardActivatedRef.current) return;
    if (!ACTIVE_TRAVEL_PHASES.has(activeTrip.trip_phase)) return;

    const key = `morales_medguard_activated_${activeTrip.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    medguardActivatedRef.current = true;

    // Small delay so it doesn't clash with the greeting notification
    setTimeout(() => {
      showNotification({
        type:     'success',
        icon:     '🛡️',
        title:    'MedGuard™ Protection Active',
        body:     'We are monitoring your safety in real time. You are not alone — Morales is watching.',
        duration: 7000,
        position: 'top',
      });
    }, 2500);
  }, [activeTrip?.trip_phase, activeTrip?.id]);

  // ── 3. Daily greeting (once per session) ─────────────────────────────────
  useEffect(() => {
    if (!user || greetedRef.current) return;
    greetedRef.current = true;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = user.full_name?.split(' ')[0] || '';

    showNotification({
      type:     'info',
      icon:     hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙',
      title:    `${greeting}${name ? `, ${name}` : ''}.`,
      body:     'Your Morales concierge is ready.',
      duration: 4000,
      position: 'top',
    });
  }, [user?.id]);

  // ── 4. Country arrival ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNewCountry || !country) return;

    const lastNotified = sessionStorage.getItem(COUNTRY_STORAGE_KEY);
    if (lastNotified === country) return;
    sessionStorage.setItem(COUNTRY_STORAGE_KEY, country);

    showNotification({
      type:     'arrival',
      icon:     flag || '🌍',
      title:    `Welcome to ${country}`,
      body:     activeTrip?.current_step < 4
        ? 'Your driver and hotel details are ready. Tap to view.'
        : 'Safe-T4life protection is active. Stay safe.',
      duration: 0, // stays until dismissed
      position: 'top',
      action: activeTrip ? {
        label: 'View Journey',
        onPress: () => { acknowledgeCountry(); window.location.href = '/dashboard/journey'; },
      } : null,
    });
  }, [isNewCountry, country]);

  // ── 5. Adventure prompt — fires 35s after arriving in a new country ──────
  useEffect(() => {
    if (!isNewCountry || !country) return;
    if (!activeTrip || !['arrived', 'recovery'].includes(activeTrip.trip_phase)) return;

    const key = `${ADVENTURE_STORAGE_KEY}_${country}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const t = setTimeout(() => {
      showNotification({
        type:     'info',
        icon:     '🏔️',
        title:    `What's your plan in ${country}?`,
        body:     'Let us know before you head out — nightlife, excursions, or adventures. We keep you safe.',
        duration: 0,
        position: 'top',
        action: {
          label:   'Plan Safely →',
          onPress: () => { window.location.href = '/dashboard/adventure'; },
        },
      });
    }, 35_000); // 35s after arrival notification so they don't stack

    return () => clearTimeout(t);
  }, [isNewCountry, country, activeTrip?.trip_phase]);

  // ── Evening adventure reminder (6 PM – 11 PM, once per day) ─────────────
  useEffect(() => {
    if (!activeTrip) return;
    if (!['arrived', 'recovery'].includes(activeTrip.trip_phase)) return;

    const today = new Date().toDateString();
    const stored = localStorage.getItem(EVENING_STORAGE_KEY);
    if (stored === today) return;

    const hour = new Date().getHours();
    if (hour < 18 || hour >= 23) return; // only 6 PM – 11 PM

    localStorage.setItem(EVENING_STORAGE_KEY, today);

    showNotification({
      type:     'info',
      icon:     '🌆',
      title:    'Going out tonight?',
      body:     `Activate Nightlife Safety Mode before you head out in ${country || 'your destination'}. We monitor until you're back.`,
      duration: 0,
      position: 'top',
      action: {
        label:   'Activate Safety Mode',
        onPress: () => { window.location.href = '/nightlife-safety'; },
      },
    });
  }, [activeTrip?.trip_phase, country]);

  // ── 6. Driver ETA (transit_out phase, HS1 not yet done) ──────────────────
  useEffect(() => {
    if (!activeTrip) return;
    if (activeTrip.trip_phase !== 'transit_out') return;
    if (activeTrip.current_step >= 1) return; // HS1 already confirmed = driver arrived

    // Estimate ETA from handshake schedule or show a live update
    const lastEta = lastEtaRef.current;
    const now = Date.now();
    if (lastEta && now - lastEta < DRIVER_ETA_POLL_MS) return; // don't spam
    lastEtaRef.current = now;

    // ETA from trip data if available, else generic
    const etaMins = activeTrip.driver_eta_minutes ?? null;
    const etaLabel = etaMins != null
      ? `${etaMins} min${etaMins !== 1 ? 's' : ''} away`
      : 'on the way';

    showNotification({
      type:     'driver',
      icon:     '🚗',
      title:    `Your driver is ${etaLabel}`,
      body:     activeTrip.driver_name
        ? `${activeTrip.driver_name} · Confirm pickup with Handshake 1`
        : 'Confirm your pickup with Handshake 1 when they arrive.',
      duration: 8000,
      position: 'top',
    });
  }, [activeTrip?.trip_phase, activeTrip?.current_step]);

  // ── 6. Handshake step completion ─────────────────────────────────────────
  const prevStepRef = useRef(null);
  useEffect(() => {
    if (!activeTrip) return;
    const step = activeTrip.current_step ?? 0;
    if (step === 0 || step === prevStepRef.current) return;

    prevStepRef.current = step;

    const STEP_LABELS = [
      '', 'Driver Pickup', 'Airport Drop-off', 'Destination Pickup',
      'Hotel Check-in', 'Clinic Arrival', 'Companion Delivery',
      'Return Transport', 'Home Airport', 'Home Drop-off',
    ];
    const STEP_ICONS = ['', '🚗', '✈️', '🛬', '🏨', '🏥', '🍽️', '🚕', '🛫', '🏠'];

    if (step === 9) {
      showNotification({
        type:     'handshake',
        icon:     '⭐',
        title:    'Journey Complete — The Golden M is Yours',
        body:     'All 9 handshakes confirmed. Welcome home.',
        duration: 0,
        position: 'top',
      });
    } else {
      showNotification({
        type:     'handshake',
        icon:     STEP_ICONS[step] || '✅',
        title:    `HS${step} Confirmed — ${STEP_LABELS[step]}`,
        body:     `Next: HS${step + 1} — ${STEP_LABELS[step + 1]}`,
        duration: 5000,
        position: 'top',
      });
    }
  }, [activeTrip?.current_step]);

  // ── Weather-aware behavioral nudge (Open-Meteo — free, no API key needed) ─
  // Checks patient's current location temperature. Hot climate → hydration reminder.
  // Runs every 2 hours during active travel phases. Suppressed once per day.
  useEffect(() => {
    if (!activeTrip || !currentLocation?.lat) return;
    if (!['arrived', 'recovery'].includes(activeTrip.trip_phase)) return;

    const WEATHER_KEY = 'morales_weather_nudge';
    const today       = new Date().toDateString();
    if (sessionStorage.getItem(WEATHER_KEY) === today) return;

    const checkWeather = async () => {
      try {
        const { lat, lng } = currentLocation;
        const url  = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,weathercode&temperature_unit=celsius`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        const tempC       = data?.current?.temperature_2m;
        const feelsLikeC  = data?.current?.apparent_temperature;
        const wcode       = data?.current?.weathercode;
        if (tempC == null) return;

        const hour = new Date().getHours();

        // Hot climate hydration reminder (>= 32°C / 90°F)
        if (tempC >= 32) {
          sessionStorage.setItem(WEATHER_KEY, today);
          showNotification({
            type: 'info', icon: '💧',
            title: `${Math.round(tempC)}°C in your location — stay hydrated`,
            body: feelsLikeC && feelsLikeC > tempC
              ? `Feels like ${Math.round(feelsLikeC)}°C. Drink at least 500ml of water before your appointment today.`
              : 'High temperature alert. Drink water regularly and rest in cool spaces.',
            duration: 8000, position: 'top',
          });
        }

        // Rain / storm warning (wcode 61–99 = rain/thunderstorm)
        if (wcode >= 61 && wcode <= 99 && hour >= 6 && hour <= 20) {
          const alreadySent = sessionStorage.getItem(`morales_rain_${today}`);
          if (!alreadySent) {
            sessionStorage.setItem(`morales_rain_${today}`, '1');
            showNotification({
              type: 'info', icon: '🌧️',
              title: 'Rain expected today',
              body: 'Pack an umbrella and allow extra travel time to your clinic. Your driver has been notified.',
              duration: 6000, position: 'top',
            });
          }
        }

        // Clinic countdown — 2 hours before departure, remind them to get ready
        if (hour === 8 && activeTrip.trip_phase === 'arrived') {
          const clinicKey = `morales_clinic_reminder_${today}`;
          if (!sessionStorage.getItem(clinicKey)) {
            sessionStorage.setItem(clinicKey, '1');
            showNotification({
              type: 'info', icon: '🏥',
              title: 'Clinic day — prepare now',
              body: 'Your procedure is today. Confirm you have your ID, fast if required, and your driver is confirmed.',
              duration: 0, position: 'top',
              action: { label: 'View Schedule →', onPress: () => { window.location.href = '/dashboard/journey'; } },
            });
          }
        }

      } catch (_) {}
    };

    checkWeather();
    const interval = setInterval(checkWeather, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.trip_phase, currentLocation?.lat]);

  // ── Earthquake monitor — checks USGS every 10 min when user has active trip ─
  useEffect(() => {
    if (!activeTrip || !currentLocation?.lat) return;

    const checkQuake = async () => {
      try {
        const now = new Date();
        const past2h = new Date(now - 2 * 60 * 60 * 1000).toISOString().split('.')[0];
        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${past2h}&minmagnitude=5.0&latitude=${currentLocation.lat}&longitude=${currentLocation.lng}&maxradiuskm=400&limit=1&orderby=magnitude`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        const quake = data?.features?.[0];
        if (!quake) return;
        const mag = quake.properties.magnitude ?? quake.properties.mag;
        const place = quake.properties.place;
        const key = `morales_quake_alerted_${quake.id}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        showNotification({
          type:     'alert',
          icon:     '🌍',
          title:    `M${parseFloat(mag).toFixed(1)} Earthquake — ${place}`,
          body:     mag >= 6
            ? 'Strong earthquake detected near you. Follow DROP-COVER-HOLD procedures immediately.'
            : 'Earthquake detected nearby. Stay alert and avoid damaged structures.',
          duration: 0,
          position: 'top',
          action: {
            label:   'Earthquake Guide →',
            onPress: () => { window.location.href = '/emergency'; },
          },
        });
      } catch (_) {}
    };

    checkQuake();
    const interval = setInterval(checkQuake, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTrip?.id, currentLocation?.lat]);

  // ── EVN-iQ400: Area Safety Monitor ─────────────────────────────────────────
  // Fires when the patient moves >400m into a new area during an active trip.
  // Waits 30s to confirm they're staying (not just driving through).
  //
  // Bug-resistant timer design: the 30s timer is stored in a ref so GPS ticks
  // don't cancel it — GPS updates every 30-60s, which would continuously reset
  // a cleanup-based timer and prevent it from ever firing.
  //
  // Fallback chain (online → offline → silent):
  //   1. Nominatim reverse-geocode → InvokeLLM area assessment (online)
  //   2. Known high-risk neighbourhood keyword list (offline)
  //   3. Silent fail
  const lastAssessedRef  = useRef(null);   // { lat, lng } — last completed assessment
  const pendingPointRef  = useRef(null);   // { lat, lng } — point currently being timed
  const areaTimerRef     = useRef(null);   // the 30s setTimeout handle (stored in ref)

  // Known high-risk neighbourhood keywords for offline fallback.
  // Sourced from public government travel advisory data.
  const HIGH_RISK_KEYWORDS = new Set([
    'tepito','doctores','merced','guerrero','iztapalapa','ecatepec',    // Mexico City
    'zona norte','la libertad','sanchez taboada',                        // Tijuana
    'petare','catia','la vega','antimano','el valle','carapita',         // Caracas
    'ciudad bolivar','el lidice',                                        // Caracas
    'la sierra','el salado','moravia','manrique',                        // Medellín
    'aguablanca','siloé','terrón colorado',                              // Cali
    'complexo do alemão','jacarezinho','vigário geral','acari',          // Rio
    'capão redondo','jardim ângela','cidade tiradentes',                 // São Paulo
  ]);

  function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Persist assessment results to localStorage (24h TTL) to avoid
  // re-burning LLM credits if the patient visits the same area later.
  function readAreaCache(key) {
    try {
      const raw = localStorage.getItem(`evn_area_${key}`);
      if (!raw) return null;
      const { risk, ts } = JSON.parse(raw);
      return (Date.now() - ts < 24 * 60 * 60 * 1000) ? risk : null;
    } catch { return null; }
  }
  function writeAreaCache(key, risk) {
    try { localStorage.setItem(`evn_area_${key}`, JSON.stringify({ risk, ts: Date.now() })); } catch {}
  }

  useEffect(() => {
    if (!activeTrip || !currentLocation?.lat || !currentLocation?.lng) return;
    if (!ACTIVE_TRAVEL_PHASES.has(activeTrip.trip_phase)) return;

    const lat = currentLocation.lat;
    const lng = currentLocation.lng;

    // Already assessed a nearby point recently? Skip.
    const lastA = lastAssessedRef.current;
    if (lastA && haversineM(lat, lng, lastA.lat, lastA.lng) < 400) return;

    // Already have a pending timer for this vicinity? Don't restart it.
    const pending = pendingPointRef.current;
    if (pending && haversineM(lat, lng, pending.lat, pending.lng) < 400) return;

    // New area — cancel any existing timer and set a fresh one.
    clearTimeout(areaTimerRef.current);
    pendingPointRef.current = { lat, lng };

    areaTimerRef.current = setTimeout(async () => {
      pendingPointRef.current = null;
      lastAssessedRef.current = { lat, lng };

      try {
        // ── Step 1: Reverse-geocode to neighbourhood name ──────────────────
        const geoRes  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json&zoom=10`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'MoralesMedical/1.0' }, signal: AbortSignal.timeout(6000) }
        );
        const geo     = await geoRes.json();
        const suburb  = geo.address?.suburb || geo.address?.neighbourhood || geo.address?.city_district || '';
        const city    = geo.address?.city   || geo.address?.town          || geo.address?.village       || '';
        const nation  = geo.address?.country || '';
        const areaKey = `${suburb}_${city}`.toLowerCase().replace(/\W+/g, '_').slice(0, 60);

        // ── Step 2: Check 24h localStorage cache ──────────────────────────
        const cached = readAreaCache(areaKey);
        if (cached) {
          if (cached === 'HIGH' || cached === 'MODERATE') {
            showNotification({
              type: 'alert', icon: cached === 'HIGH' ? '🔴' : '🟡',
              title: `EVN-iQ400 · ${cached === 'HIGH' ? 'High-Risk Area' : 'Area Advisory'}`,
              body: `${suburb || city} is flagged as ${cached.toLowerCase()} risk. Stay alert and use your Morales-vetted transport.`,
              duration: cached === 'HIGH' ? 0 : 12000, position: 'top',
              action: cached === 'HIGH' ? { label: 'Contact Concierge →', onPress: () => { window.location.href = '/emergency'; } } : null,
            });
          }
          return;
        }

        // ── Step 3a: Online → LLM assessment ──────────────────────────────
        if (navigator.onLine && !isSystemPaused()) {
          const res  = await base44.integrations.Core.InvokeLLM({
            prompt: `Travel safety AI for Morales Medical Concierge. Patient is in: "${suburb ? suburb + ', ' : ''}${city}, ${nation}". Assess risk for international medical tourist. Respond with JSON only (no fences): {"risk":"LOW"|"MODERATE"|"HIGH","reason":"factual sentence under 18 words","tip":"protective action under 12 words"}`,
            response_type: 'text',
          });
          const text = typeof res === 'string' ? res : (res?.result || res?.text || '');
          const clean = text.replace(/```[\w]*\n?|\n?```/g, '').trim();

          let parsed;
          try {
            parsed = JSON.parse(clean);
          } catch {
            // Structured parse failed — extract risk level from free text
            const m = text.match(/\b(HIGH|MODERATE|LOW)\b/i);
            if (!m) return;
            parsed = { risk: m[1].toUpperCase(), reason: 'Exercise caution in this area.', tip: 'Stay close to your hotel or Morales venue.' };
          }

          const risk = (parsed.risk || '').toUpperCase();
          writeAreaCache(areaKey, risk);

          if (risk === 'HIGH' || risk === 'MODERATE') {
            showNotification({
              type: 'alert', icon: risk === 'HIGH' ? '🔴' : '🟡',
              title: `EVN-iQ400 · ${risk === 'HIGH' ? 'High-Risk Area Detected' : 'Area Advisory'}`,
              body: `${parsed.reason || ''} ${parsed.tip || ''}`.trim(),
              duration: risk === 'HIGH' ? 0 : 12000, position: 'top',
              action: risk === 'HIGH' ? { label: 'Contact Concierge →', onPress: () => { window.location.href = '/emergency'; } } : null,
            });
          }
          return;
        }

        // ── Step 3b: Offline → keyword fallback ───────────────────────────
        const suburbLow = suburb.toLowerCase();
        const isKnownRisk = HIGH_RISK_KEYWORDS.has(suburbLow) || [...HIGH_RISK_KEYWORDS].some(kw => suburbLow.includes(kw));
        if (isKnownRisk) {
          writeAreaCache(areaKey, 'HIGH');
          showNotification({
            type: 'alert', icon: '🔴',
            title: 'EVN-iQ400 · High-Risk Area (Offline)',
            body: `${suburb || city} is on Morales\' offline risk list. Return to your hotel or contact your concierge.`,
            duration: 0, position: 'top',
            action: { label: 'SOS →', onPress: () => { window.location.href = '/emergency'; } },
          });
        }

      } catch (_) {
        // All steps failed — silent. Safety not degraded, user can still use SOS.
      }
    }, 30_000); // 30s dwell time before assessing
  }, [currentLocation?.lat, currentLocation?.lng]);

  // Clean up on unmount
  useEffect(() => () => clearTimeout(areaTimerRef.current), []);

  return null; // pure side-effect component
}
