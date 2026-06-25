import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNotification } from '@/context/NotificationContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';

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

  return null; // pure side-effect component
}
