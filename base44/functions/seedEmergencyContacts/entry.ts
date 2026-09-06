import { createHandler, ok } from '../../shared/createHandler.ts';

// Seeds the EmergencyContacts table, which today has zero rows for any
// country — getGuardianViewData/entry.ts already has a comment flagging this
// ("that table needs seeding"), and GuardianView.jsx's "Local Emergency"
// button simply never renders as a result. Admin-only, idempotent (filters
// by country_name before each create, so re-running never duplicates rows —
// same pattern as seedDemoJourney).
//
// The 20 entries marked (NaturalDisasterPanel) are reused verbatim from
// src/components/emergency/NaturalDisasterPanel.jsx's COUNTRY_DATA — already
// curated and shown elsewhere in this app, not invented for this function.
// The 6 entries marked (verified) were looked up live via WebSearch against
// official/authoritative sources (police service sites, government emergency
// pages) to cover every country this app references (visaMatrix.js,
// TaxiServiceSignupStep2.jsx's operating countries) that NaturalDisasterPanel
// didn't already have. country_name values match the exact strings used
// elsewhere in this app (procedure_country / current_country / visaMatrix
// keys) so getGuardianViewData's exact-match filter finds them.
const COUNTRIES: { country_name: string; emergency_number: string; police?: string; fire?: string; ambulance?: string; notes?: string }[] = [
  // NaturalDisasterPanel — reused verbatim
  { country_name: 'Mexico',             emergency_number: '911' },
  { country_name: 'Colombia',           emergency_number: '123' },
  { country_name: 'Costa Rica',         emergency_number: '911' },
  { country_name: 'Dominican Republic', emergency_number: '911' },
  { country_name: 'Panama',             emergency_number: '911' },
  { country_name: 'Venezuela',          emergency_number: '911' },
  { country_name: 'Argentina',          emergency_number: '911' },
  { country_name: 'Brazil',             emergency_number: '192', notes: 'SAMU medical emergency number; police is 190, fire is 193' },
  { country_name: 'Thailand',           emergency_number: '191', notes: 'Police/general; tourist police 1155, medical/EMS 1669' },
  { country_name: 'Turkey',             emergency_number: '112' },
  { country_name: 'India',              emergency_number: '112' },
  { country_name: 'Spain',              emergency_number: '112' },
  { country_name: 'Portugal',           emergency_number: '112' },
  { country_name: 'Hungary',            emergency_number: '112' },
  { country_name: 'Poland',             emergency_number: '112' },
  { country_name: 'United States',      emergency_number: '911' },
  { country_name: 'United Kingdom',     emergency_number: '999' },
  { country_name: 'Japan',              emergency_number: '119', notes: 'Fire/ambulance; police is 110' },
  { country_name: 'Philippines',        emergency_number: '911' },
  { country_name: 'Indonesia',          emergency_number: '112' },
  // Verified live via WebSearch this session — not previously curated anywhere in this app
  { country_name: 'Jamaica',            emergency_number: '119', police: '119', fire: '110', ambulance: '110' },
  { country_name: 'Barbados',           emergency_number: '211', police: '211', fire: '311', ambulance: '511' },
  { country_name: 'Trinidad and Tobago', emergency_number: '999', police: '999', fire: '990', ambulance: '811' },
  { country_name: 'Belize',             emergency_number: '911', police: '911', fire: '990' },
  { country_name: 'Malaysia',           emergency_number: '999' },
  { country_name: 'South Korea',        emergency_number: '112', police: '112', fire: '119', ambulance: '119' },
];

Deno.serve(createHandler(async ({ base44 }) => {
  const results: { country_name: string; status: 'created' | 'already_exists' }[] = [];

  for (const entry of COUNTRIES) {
    const existing = await base44.asServiceRole.entities.EmergencyContacts.filter({ country_name: entry.country_name });
    if (existing.length > 0) {
      results.push({ country_name: entry.country_name, status: 'already_exists' });
      continue;
    }
    // Explicit honest defaults for the Tier 2 emergency-packet fields — never
    // rely solely on schema-level defaults for a fresh environment. Real value
    // only ever comes from an admin setting has_human_safety_partner:true once
    // a real vendor relationship + legal review exist (none does today).
    await base44.asServiceRole.entities.EmergencyContacts.create({
      has_human_safety_partner: false,
      languages_supported: [],
      ...entry,
    });
    results.push({ country_name: entry.country_name, status: 'created' });
  }

  const createdCount = results.filter((r) => r.status === 'created').length;
  return ok({
    total: results.length,
    created: createdCount,
    already_existed: results.length - createdCount,
    results,
    message: `Seeded ${createdCount} new country row(s), ${results.length - createdCount} already existed.`,
  });
}, { name: 'seedEmergencyContacts', allowedRoles: ['admin', 'platform_admin'] }));
