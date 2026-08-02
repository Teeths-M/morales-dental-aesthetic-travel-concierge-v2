import { createHandler, ok, err } from '../../shared/createHandler.ts';

// ── checkWeatherAlerts ─────────────────────────────────────────────────────────
// CR 25 — Weather-to-Health Alert
// Checks real-time weather for a patient's destination and returns a 4-party
// action plan (patient, companion, clinic, driver) based on severity.
//
// Weather data: Open-Meteo (free, no API key required)
// Disaster data: GDACS RSS (24-hour global disaster feed, free, no key)
//
// Actions:
//   scan      — check weather for one case by case_id
//   scan_all  — check all active cases (admin only, returns summary)
//   demo      — returns mock alert for testing/demos

// ── Country → lat/lng lookup (top 50 medical tourism destinations) ─────────────
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  mexico:         { lat: 19.43, lng: -99.13,  name: 'Mexico'        },
  colombia:       { lat: 4.71,  lng: -74.07,  name: 'Colombia'      },
  thailand:       { lat: 13.75, lng: 100.52,  name: 'Thailand'      },
  india:          { lat: 28.61, lng: 77.21,   name: 'India'         },
  turkey:         { lat: 41.01, lng: 28.95,   name: 'Turkey'        },
  brazil:         { lat: -23.55, lng: -46.63, name: 'Brazil'        },
  malaysia:       { lat: 3.14,  lng: 101.69,  name: 'Malaysia'      },
  'costa rica':   { lat: 9.93,  lng: -84.08,  name: 'Costa Rica'    },
  panama:         { lat: 8.99,  lng: -79.52,  name: 'Panama'        },
  philippines:    { lat: 14.60, lng: 120.98,  name: 'Philippines'   },
  'south korea':  { lat: 37.57, lng: 126.98,  name: 'South Korea'   },
  taiwan:         { lat: 25.04, lng: 121.56,  name: 'Taiwan'        },
  hungary:        { lat: 47.50, lng: 19.04,   name: 'Hungary'       },
  poland:         { lat: 52.23, lng: 21.01,   name: 'Poland'        },
  argentina:      { lat: -34.60, lng: -58.38, name: 'Argentina'     },
  venezuela:      { lat: 10.49, lng: -66.88,  name: 'Venezuela'     },
  'trinidad and tobago': { lat: 10.65, lng: -61.52, name: 'Trinidad & Tobago' },
  jamaica:        { lat: 17.99, lng: -76.79,  name: 'Jamaica'       },
  'dominican republic': { lat: 18.48, lng: -69.90, name: 'Dominican Republic' },
  cuba:           { lat: 23.13, lng: -82.38,  name: 'Cuba'          },
  barbados:       { lat: 13.10, lng: -59.61,  name: 'Barbados'      },
  'saint lucia':  { lat: 13.91, lng: -60.98,  name: 'Saint Lucia'   },
  egypt:          { lat: 30.04, lng: 31.24,   name: 'Egypt'         },
  israel:         { lat: 31.77, lng: 35.22,   name: 'Israel'        },
  jordan:         { lat: 31.96, lng: 35.95,   name: 'Jordan'        },
  spain:          { lat: 40.42, lng: -3.70,   name: 'Spain'         },
  portugal:       { lat: 38.72, lng: -9.14,   name: 'Portugal'      },
  singapore:      { lat: 1.35,  lng: 103.82,  name: 'Singapore'     },
};

// ── WMO weather code severity ─────────────────────────────────────────────────
// https://open-meteo.com/en/docs#weathervariables
function wmoSeverity(code: number): 'clear' | 'advisory' | 'warning' | 'critical' {
  if (code === 0 || code === 1) return 'clear';
  if (code <= 3) return 'clear';                  // partly cloudy
  if (code <= 49) return 'advisory';              // fog, freezing fog
  if (code <= 69) return 'warning';               // drizzle, rain
  if (code <= 79) return 'warning';               // snow
  if (code <= 84) return 'warning';               // rain showers
  if (code <= 94) return 'advisory';              // snow showers, hail
  return 'critical';                              // thunderstorm (95, 96, 99)
}

function wmoLabel(code: number): string {
  const labels: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Heavy thunderstorm with hail',
  };
  return labels[code] || 'Unusual weather';
}

// ── Temperature severity ──────────────────────────────────────────────────────
function tempSeverity(tempC: number): 'clear' | 'advisory' | 'warning' | 'critical' {
  if (tempC >= 42) return 'critical';
  if (tempC >= 37) return 'warning';
  if (tempC >= 33) return 'advisory';
  if (tempC <= -5) return 'warning';
  if (tempC <= 5)  return 'advisory';
  return 'clear';
}

// ── Overall severity (highest wins) ──────────────────────────────────────────
const SEV_RANK = { clear: 0, advisory: 1, warning: 2, critical: 3 };
function maxSeverity(...levels: Array<'clear' | 'advisory' | 'warning' | 'critical'>) {
  return levels.reduce((a, b) => SEV_RANK[b] > SEV_RANK[a] ? b : a, 'clear' as const);
}

// ── 4-party action plan ───────────────────────────────────────────────────────
function buildActionPlan(
  severity: 'clear' | 'advisory' | 'warning' | 'critical',
  conditions: string[],
  maxTempC: number,
  procedureType: string,
) {
  const isHot = maxTempC >= 33;
  const isCold = maxTempC <= 5;
  const isSurgical = /dental|aesthetic|implant|rhinoplasty|lift|tuck|lipo|bbl|veneers/i.test(procedureType);

  const plan: { patient: string[]; companion: string[]; clinic: string[]; driver: string[] } = {
    patient: [], companion: [], clinic: [], driver: [],
  };

  if (severity === 'clear') {
    plan.patient   = ['Conditions look good for your travel and recovery.'];
    plan.companion = ['Standard care plan — no weather adjustments needed.'];
    plan.clinic    = ['No environment adjustments required.'];
    plan.driver    = ['All clear — standard route.'];
    return plan;
  }

  if (isHot) {
    plan.patient.push(
      `High temperature (${Math.round(maxTempC)}°C) expected. Stay hydrated — minimum 2L water daily.`,
      'Wear light, loose clothing — avoid tight garments over healing areas.',
      isSurgical ? 'Heat increases swelling. Rest indoors during peak hours (12pm–4pm).' : '',
    );
    plan.companion.push(
      'Bring a small cooler with cold water and light snacks.',
      'Cooling towels and a portable fan — essentials for this trip.',
      isSurgical ? 'Monitor patient for excessive swelling — heat can accelerate post-op inflammation.' : '',
    );
    plan.clinic.push(
      'Ensure recovery room air conditioning is set to 20–22°C.',
      isSurgical ? 'Consider extended monitoring period due to heat-related inflammation risk.' : '',
      'Cold compress packs should be available for patient comfort.',
    );
    plan.driver.push(
      'Pre-cool the vehicle before patient pickup.',
      'Avoid peak-traffic hours — keep patient in air conditioning as long as possible.',
    );
  }

  if (isCold) {
    plan.patient.push(
      'Cold conditions may slow healing. Your recovery timeline may extend by 1–2 days.',
      'Keep healing areas warm and dry — avoid cold drafts.',
    );
    plan.companion.push(
      'Pack extra blankets and warm layers for the patient.',
      isSurgical ? 'Monitor for wound site chilling — keep healing areas covered.' : '',
    );
    plan.clinic.push(
      'Ensure clinic temperature is maintained at 22–24°C.',
      isSurgical ? 'Warm IV fluids during procedure if applicable.' : '',
    );
    plan.driver.push(
      'Pre-warm vehicle before pickup.',
      'Bring a blanket for patient transport.',
    );
  }

  if (conditions.some(c => c.toLowerCase().includes('rain') || c.toLowerCase().includes('storm'))) {
    plan.patient.push('Rain expected — wear non-slip footwear. Wet floors are a fall risk post-surgery.');
    plan.companion.push('Bring a large umbrella. Help patient navigate wet surfaces.');
    plan.clinic.push('Place slip-hazard mats at clinic entrance.');
    plan.driver.push('Allow extra travel time. Drop off at covered entrance only.');
  }

  if (severity === 'critical') {
    plan.patient.push('⚠ Severe weather alert. M is monitoring your situation. Do not travel without companion.');
    plan.companion.push('⚠ Remain with patient at all times. Check in with M coordinator every 2 hours.');
    plan.clinic.push('⚠ Activate weather contingency protocol. Ensure patient has shelter access at all times.');
    plan.driver.push('⚠ Standby for emergency evacuation route. Confirm vehicle is fueled and ready.');
  }

  // Remove empty strings
  for (const k of ['patient', 'companion', 'clinic', 'driver'] as const) {
    plan[k] = plan[k].filter(Boolean);
  }

  return plan;
}

// ── Fetch weather from Open-Meteo (no API key) ────────────────────────────────
async function fetchWeather(lat: number, lng: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation');
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum,wind_speed_10m_max,weather_code');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

// ── Build alert from weather data ─────────────────────────────────────────────
function buildAlert(weather: any, countryName: string, procedureType: string, recoveryDay: number) {
  const current = weather.current;
  const daily   = weather.daily;

  const currentTemp   = current.temperature_2m as number;
  const currentCode   = current.weather_code as number;
  const currentWind   = current.wind_speed_10m as number;

  // Peak conditions over next 7 days
  const maxTemps     = daily.temperature_2m_max as number[];
  const dailyCodes   = daily.weather_code as number[];
  const maxTemp7d    = Math.max(...maxTemps);
  const worstCode7d  = dailyCodes.reduce((worst: number, c: number) => SEV_RANK[wmoSeverity(c)] > SEV_RANK[wmoSeverity(worst)] ? c : worst, 0);

  const conditions: string[] = [];
  if (currentCode > 1) conditions.push(wmoLabel(currentCode));
  if (currentTemp >= 33) conditions.push(`High temperature: ${Math.round(currentTemp)}°C`);
  if (currentTemp <= 5)  conditions.push(`Cold temperature: ${Math.round(currentTemp)}°C`);
  if (currentWind >= 40) conditions.push(`Strong winds: ${Math.round(currentWind)} km/h`);
  if (conditions.length === 0) conditions.push('Clear conditions');

  // Severity: worst of current temp, current weather, and 7-day peak
  const sev = maxSeverity(
    wmoSeverity(currentCode),
    wmoSeverity(worstCode7d),
    tempSeverity(currentTemp),
    tempSeverity(maxTemp7d),
  );

  const actionPlan = buildActionPlan(sev, conditions, Math.max(currentTemp, maxTemp7d), procedureType);

  return {
    country: countryName,
    severity: sev,
    conditions,
    current: {
      temp_c: Math.round(currentTemp),
      weather: wmoLabel(currentCode),
      wind_kmh: Math.round(currentWind),
      humidity_pct: current.relative_humidity_2m,
    },
    forecast_7d: {
      max_temp_c: Math.round(maxTemp7d),
      worst_condition: wmoLabel(worstCode7d),
    },
    recovery_day: recoveryDay,
    action_plan: actionPlan,
    checked_at: new Date().toISOString(),
  };
}

// ── Mock alert for demo/testing ───────────────────────────────────────────────
function mockAlert(country: string) {
  return {
    country: country || 'Mexico',
    severity: 'warning',
    conditions: ['High temperature: 38°C', 'Moderate rain showers'],
    current: { temp_c: 38, weather: 'Moderate rain showers', wind_kmh: 22, humidity_pct: 85 },
    forecast_7d: { max_temp_c: 40, worst_condition: 'Thunderstorm' },
    recovery_day: 3,
    action_plan: buildActionPlan('warning', ['High temperature: 38°C', 'Rain'], 38, 'Dental Implants'),
    checked_at: new Date().toISOString(),
    source: 'demo',
  };
}

// ── Resolve country to coords ─────────────────────────────────────────────────
async function resolveCountry(raw: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const key = raw.toLowerCase().trim();
  if (COUNTRY_COORDS[key]) return COUNTRY_COORDS[key];

  // Partial match
  const partial = Object.entries(COUNTRY_COORDS).find(([k]) => k.includes(key) || key.includes(k));
  if (partial) return partial[1];

  // Fallback: Open-Meteo geocoding
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(raw)}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const r = data.results?.[0];
    if (r) return { lat: r.latitude, lng: r.longitude, name: r.country || raw };
  } catch (_) { /* ignore */ }

  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { action, case_id, country, procedure_type, recovery_day } = await body<{
    action: string;
    case_id?: string;
    country?: string;
    procedure_type?: string;
    recovery_day?: number;
  }>();

  if (!action) return err('action is required (scan | scan_all | demo)');

  // ── DEMO ────────────────────────────────────────────────────────────────────
  if (action === 'demo') {
    return ok({ success: true, alert: mockAlert(country || 'Mexico') });
  }

  // ── SCAN ONE CASE ────────────────────────────────────────────────────────────
  if (action === 'scan') {
    if (!case_id && !country) return err('case_id or country is required');

    let targetCountry = country || '';
    let targetProcedure = procedure_type || 'General';
    let targetRecoveryDay = recovery_day ?? 0;

    if (case_id) {
      const rec = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      if (!rec) return err('Case not found', 404);
      targetCountry = rec.procedure_country || rec.destination_country || targetCountry;
      targetProcedure = rec.primary_procedure || targetProcedure;
      if (rec.procedure_date) {
        const daysDiff = Math.floor((Date.now() - new Date(rec.procedure_date).getTime()) / 86_400_000);
        targetRecoveryDay = Math.max(0, daysDiff);
      }
    }

    if (!targetCountry) return err('No country found for this case');

    const coords = await resolveCountry(targetCountry);
    if (!coords) return err(`Could not locate country: ${targetCountry}`, 422);

    const weather = await fetchWeather(coords.lat, coords.lng);
    const alert = buildAlert(weather, coords.name, targetProcedure, targetRecoveryDay);

    return ok({ success: true, alert, case_id: case_id || null });
  }

  // ── SCAN ALL ACTIVE CASES (admin) ────────────────────────────────────────────
  if (action === 'scan_all') {
    const ADMIN_ROLES = ['admin', 'platform_admin', 'coordinator'];
    if (!user || !ADMIN_ROLES.includes(user.role)) return err('Forbidden', 403);

    const activeCases = await base44.asServiceRole.entities.CaseRecord.filter(
      {}, '-created_date', 50
    );

    const withCountry = activeCases.filter(
      (c: any) => (c.procedure_country || c.destination_country) && c.status !== 'Completed'
    );

    const results = await Promise.allSettled(
      withCountry.map(async (c: any) => {
        const raw = c.procedure_country || c.destination_country;
        const coords = await resolveCountry(raw);
        if (!coords) return { case_id: c.id, country: raw, error: 'unresolvable' };
        const weather = await fetchWeather(coords.lat, coords.lng);
        const daysDiff = c.procedure_date
          ? Math.floor((Date.now() - new Date(c.procedure_date).getTime()) / 86_400_000)
          : 0;
        const alert = buildAlert(weather, coords.name, c.primary_procedure || 'General', Math.max(0, daysDiff));
        return { case_id: c.id, client_name: c.client_name || c.client_email, ...alert };
      })
    );

    const alerts = results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value)
      .sort((a: any, b: any) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0));

    const summary = {
      total_scanned: withCountry.length,
      critical: alerts.filter((a: any) => a.severity === 'critical').length,
      warning:  alerts.filter((a: any) => a.severity === 'warning').length,
      advisory: alerts.filter((a: any) => a.severity === 'advisory').length,
      clear:    alerts.filter((a: any) => a.severity === 'clear').length,
    };

    return ok({ success: true, summary, alerts });
  }

  return err('Invalid action. Use: scan | scan_all | demo');

}, { name: 'checkWeatherAlerts', requireAuth: false }));
