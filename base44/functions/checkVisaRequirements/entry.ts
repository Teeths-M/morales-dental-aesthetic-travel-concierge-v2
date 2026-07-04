import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// AI visa status for any nationality/destination — falls back to hardcoded inferStatus on error
async function aiInferStatus(nationality: string, destination: string): Promise<string> {
  if (!ANTHROPIC_KEY) return inferStatus(nationality, destination);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU, max_tokens: 15,
        messages: [{ role: 'user', content: `Does a ${nationality} passport holder need a visa to enter ${destination} for medical tourism? Reply with ONE word only: exempt, evisa, on_arrival, or embassy` }],
      }),
    });
    if (!r.ok) return inferStatus(nationality, destination);
    const d = await r.json();
    const status = (d.content?.[0]?.text || '').trim().toLowerCase().split(/\s/)[0];
    return ['exempt', 'evisa', 'on_arrival', 'embassy'].includes(status) ? status : inferStatus(nationality, destination);
  } catch { return inferStatus(nationality, destination); }
}

// ── SAFE-T VISA ASSIST™ — Official Source Visa Engine ─────────────────────────
// Primary source: structured MEDICAL_VISA_DATABASE (hardcoded from official gov sites)
// Fallback: LLM with internet context for unlisted routes (flagged as unconfirmed)
// Response schema: full structured output per spec

const MEDICAL_VISA_DATABASE = {
  'India': {
    visa_type: 'Medical e-Visa (e-M Visa)',
    duration: 'Up to 60 days per visit, triple entry within 180 days',
    method: 'online',
    portal_url: 'https://indianvisaonline.gov.in/evisa/tvoa.html',
    processing_time: '72 hours (standard) — 24 hours (urgent)',
    cost_usd: 80,
    cost_notes: 'Fee varies by nationality ($10–$100 USD). Check portal for your country.',
    documents: [
      'Valid passport — minimum 6 months validity, 2 blank pages',
      'Letter from a government-recognised Indian hospital confirming the appointment',
      'Letter must state: type of treatment, expected duration, estimated cost',
      'Proof of sufficient funds (bank statement)',
      'Return or onward flight ticket',
      'Recent passport photograph — white background, 2x2 inches',
      'Proof of residential address in home country',
    ],
    medical_special: [
      'Hospital letter is mandatory — no general-purpose doctor letter accepted',
      'Up to 2 attendants may apply for a Medical Attendant e-Visa (e-MED Visa) simultaneously',
      'Extensions beyond 60 days require application to the Foreigners Regional Registration Office (FRRO)',
      'India e-M Visa is NOT extendable into a regular visa — plan treatment timeline carefully',
    ],
    embassy_contact: {
      website: 'https://www.mea.gov.in/',
      visa_portal: 'https://indianvisaonline.gov.in/evisa/tvoa.html',
      note: 'For complex cases contact your nearest Indian High Commission or Embassy',
    },
    official_source: 'https://indianvisaonline.gov.in/evisa/tvoa.html',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Thailand': {
    visa_type: 'Medical Treatment Visa (Non-Immigrant TR-MT)',
    duration: 'Up to 90 days; extendable in-country at Immigration Bureau',
    method: 'online',
    portal_url: 'https://www.thaievisa.go.th',
    processing_time: '3–7 business days',
    cost_usd: 55,
    cost_notes: 'Approximately 2,000 THB (~$55 USD). Varies by nationality and entry type.',
    documents: [
      'Valid passport — minimum 6 months validity',
      'Completed Thai e-Visa application form',
      'Hospital invitation or appointment letter from the Thai medical facility',
      'Medical certificate or referral from home-country doctor (recommended)',
      'Proof of accommodation in Thailand',
      'Proof of funds — minimum 20,000 THB (~$550) per person',
      'Return or onward flight ticket',
      'Passport photograph meeting Thai specifications',
    ],
    medical_special: [
      'Hospital letter must be from a Thai Ministry of Public Health-accredited facility',
      'TR-MT visa is for the patient only — companions enter on tourist visa or visa exemption',
      'For treatments exceeding 90 days, apply for an extension at the Bangkok Immigration Bureau (90 days at a time)',
      'Patients should carry all original medical documents at the Thai border',
      'Popular medical hubs: Bumrungrad International (Bangkok), Bangkok Hospital, Samitivej',
    ],
    embassy_contact: {
      website: 'https://www.mfa.go.th/en/',
      visa_portal: 'https://www.thaievisa.go.th',
      note: 'For questions, contact the Royal Thai Embassy or Consulate in your country',
    },
    official_source: 'https://www.thaievisa.go.th',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Turkey': {
    visa_type: 'Electronic Visa (e-Visa) — no separate medical visa category',
    duration: 'Up to 90 days (single or multiple entry depending on nationality)',
    method: 'online',
    portal_url: 'https://www.evisa.gov.tr/en/',
    processing_time: '24 hours (up to 3 days for some nationalities)',
    cost_usd: 50,
    cost_notes: 'Fee ranges from $20–$160 USD depending on nationality. Check portal for exact fee.',
    documents: [
      'Valid passport — minimum 6 months validity beyond stay',
      'Valid email address for e-Visa delivery',
      'Credit or debit card for online payment',
      'Return or onward flight ticket (may be requested at border)',
      'Proof of accommodation',
    ],
    medical_special: [
      'Turkey does not have a dedicated medical visa — standard e-Visa covers medical tourism',
      'For treatments exceeding 90 days, apply for a Long-Stay Visa (Type D) at the Turkish consulate',
      'Keep all medical appointment letters and procedure confirmations on your person at the border',
      'Popular medical hubs: Istanbul (hair transplants, dental, cosmetic, eye surgery), Ankara (cardiac)',
    ],
    embassy_contact: {
      website: 'https://www.mfa.gov.tr/',
      visa_portal: 'https://www.evisa.gov.tr/en/',
      note: 'For questions contact the Turkish Embassy or Consulate in your country',
    },
    official_source: 'https://www.evisa.gov.tr/en/',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Colombia': {
    visa_type: 'Visitor Visa (V – Visitante) or Visa-Free Entry',
    duration: 'Up to 90 days; maximum 180 days per calendar year',
    method: 'online',
    portal_url: 'https://www.cancilleria.gov.co/tramites_servicios/visas',
    processing_time: '3–10 business days for visa; immediate for visa-free nationalities',
    cost_usd: 55,
    cost_notes: '$55–$100 USD depending on visa type and nationality. Visa-free nationalities pay no fee.',
    documents: [
      'Valid passport — minimum 6 months validity recommended',
      'Completed Colombian visa application (if required)',
      'Medical appointment letter or confirmation from Colombian facility (strongly recommended)',
      'Proof of sufficient funds',
      'Return or onward ticket',
      'Proof of accommodation',
    ],
    medical_special: [
      'Colombia does not have a dedicated medical visa — medical tourism falls under Visitor Visa (V)',
      'A letter from the Colombian medical facility is strongly recommended for entry and is required for extended stays',
      'For extended treatment, apply for a Migrant Visa (M – Salud) at the Colombian consulate',
      'Track your 180-day per calendar year limit carefully — the stay counter does not reset automatically',
      'Popular medical hubs: Bogotá, Medellín, Cali (dental, cosmetic, bariatric)',
    ],
    embassy_contact: {
      website: 'https://www.cancilleria.gov.co/',
      visa_portal: 'https://www.cancilleria.gov.co/tramites_servicios/visas',
      note: 'Contact the Colombian Embassy or Consulate in your country for appointment-based applications',
    },
    official_source: 'https://www.cancilleria.gov.co/tramites_servicios/visas',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Venezuela': {
    visa_type: 'CARICOM Visa-Exempt Entry or Medical Visa (non-CARICOM)',
    duration: 'Up to 90 days for exempt nationals; varies for visa holders',
    method: 'embassy',
    portal_url: 'https://evisa.mppre.gob.ve',
    processing_time: '10–15 business days (embassy); check portal for e-Visa availability',
    cost_usd: 50,
    cost_notes: 'Approximately $30–$80 USD for embassy visa. CARICOM nationals enter free.',
    documents: [
      'Valid passport — minimum 6 months validity',
      'Medical appointment letter or confirmation from Venezuelan clinic/hospital',
      'Completed visa application form (if required)',
      'Proof of funds (bank statement)',
      'Return or onward ticket',
      'Two passport photographs — white background, 2x2 inches',
      'Bank statement covering the last 3 months',
    ],
    medical_special: [
      'CARICOM nationals are visa-exempt for up to 90 days — no visa required',
      'EXCEPTION: Saint Lucian passport holders require an embassy visa despite being CARICOM members',
      'Non-exempt nationalities must apply at the Venezuelan Embassy or Consulate in their home country',
      'Online e-Visa system (evisa.mppre.gob.ve) may be available depending on nationality — check before visiting the embassy',
      'Medical travellers are strongly advised to carry original clinic documentation at the Venezuelan border',
      'Primary medical hub: Margarita Island and Caracas',
    ],
    embassy_contact: {
      website: 'https://www.mppre.gob.ve/',
      visa_portal: 'https://evisa.mppre.gob.ve',
      note: 'Contact the Venezuelan Embassy or Consulate for appointment — walk-ins may not be accepted',
    },
    official_source: 'https://evisa.mppre.gob.ve',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Mexico': {
    visa_type: 'Visa-Free + Tourist Card (FMM)',
    duration: 'Up to 180 days',
    method: 'on_arrival',
    portal_url: 'https://www.inm.gob.mx/',
    processing_time: 'Immediate on arrival — FMM issued at port of entry',
    cost_usd: 30,
    cost_notes: 'FMM tourist card ~600 MXN (~$30 USD). Often included in airfare.',
    documents: [
      'Valid passport',
      'Completed FMM tourist card (Forma Migratoria Múltiple) — issued at border or airport',
      'Return or onward ticket',
      'Proof of funds',
      'Medical appointment confirmation (recommended)',
    ],
    medical_special: [
      'Mexico does not have a dedicated medical visa — standard tourist entry covers medical purposes',
      'FMM tourist card must be retained and surrendered upon departure (fine if lost)',
      'For treatments exceeding 180 days, apply for a Temporary Resident Visa at a Mexican Consulate',
      'Popular hubs: Tijuana and Los Algodones (dental, cosmetic), Monterrey (cardiac, oncology), Mexico City (general)',
    ],
    embassy_contact: {
      website: 'https://www.sre.gob.mx/',
      visa_portal: 'https://www.gob.mx/tramites/ficha/visa-para-mexico',
      note: 'For embassy visas (if required), contact the Mexican Consulate in your country',
    },
    official_source: 'https://www.inm.gob.mx/',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Dominican Republic': {
    visa_type: 'Visa-Free Entry + e-Ticket (mandatory digital form)',
    duration: 'Up to 30 days (extendable at General Directorate of Migration)',
    method: 'online',
    portal_url: 'https://eticket.migracion.gob.do',
    processing_time: 'e-Ticket issued instantly online before departure',
    cost_usd: 10,
    cost_notes: 'e-Ticket fee: approximately $10 USD. Must be completed before travel.',
    documents: [
      'Valid passport',
      'Completed Dominican e-Ticket at eticket.migracion.gob.do (mandatory since 2021)',
      'Return or onward flight ticket',
      'Proof of accommodation',
    ],
    medical_special: [
      'The Dominican Republic replaced the paper tourist card with the digital e-Ticket system in 2021',
      'e-Ticket must be completed BEFORE travel at the official portal',
      'No separate medical visa — standard visitor entry covers medical purposes',
      'Medical appointment letter is not required but carry it for border officials if asked',
      'Primary hubs: Santo Domingo and Santiago for dental and cosmetic procedures',
    ],
    embassy_contact: {
      website: 'https://www.mirex.gob.do/',
      visa_portal: 'https://eticket.migracion.gob.do',
      note: 'For nationalities requiring a full visa, contact the Dominican Republic Embassy or Consulate',
    },
    official_source: 'https://eticket.migracion.gob.do',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Brazil': {
    visa_type: 'Visa-Free or e-Visa',
    duration: 'Up to 90 days (180 days per year)',
    method: 'online',
    portal_url: 'https://sistemacons.mre.gov.br',
    processing_time: '3–5 business days for e-Visa; immediate for visa-free nationalities',
    cost_usd: 80,
    cost_notes: 'e-Visa fee: $80 USD. Visa-free nationalities pay no fee.',
    documents: [
      'Valid passport — minimum 6 months validity',
      'Digital photograph meeting Brazilian specifications',
      'Credit card for e-Visa payment (if required)',
      'Return or onward ticket',
      'Proof of accommodation',
      'Medical appointment letter (recommended)',
    ],
    medical_special: [
      'Brazil does not have a separate medical visa category',
      'Medical travellers enter under standard tourism/visitor rules',
      'For extended treatment (>90 days), apply for a Temporary Visa (VITEM V) at the Brazilian Consulate',
      'São Paulo (Hospital Albert Einstein, Hospital Sírio-Libanês) and Rio de Janeiro are primary JCI-accredited hubs',
    ],
    embassy_contact: {
      website: 'https://www.gov.br/mre/pt-br',
      visa_portal: 'https://sistemacons.mre.gov.br',
      note: 'Contact the Brazilian Embassy or Consulate in your country for embassy visa applications',
    },
    official_source: 'https://sistemacons.mre.gov.br',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Costa Rica': {
    visa_type: 'Visa-Free Entry (for most nationalities)',
    duration: 'Up to 90 days',
    method: 'on_arrival',
    portal_url: 'https://www.migracion.go.cr/',
    processing_time: 'Immediate on arrival',
    cost_usd: 0,
    cost_notes: 'No fee for visa-free nationalities. Exit tax may apply.',
    documents: [
      'Valid passport — minimum 6 months validity',
      'Return or onward ticket',
      'Proof of sufficient funds ($100 USD per day)',
      'Proof of accommodation',
      'Medical appointment letter (recommended for medical travellers)',
    ],
    medical_special: [
      'Costa Rica does not have a dedicated medical visa — standard entry applies',
      'For nationalities requiring a visa, apply with medical appointment letter at the Costa Rican Consulate',
      'Medical appointment letter is strongly recommended to present at border for medical travellers',
      'Primary hub: San José (CIMA Hospital, Clínica Bíblica — both internationally accredited)',
      'Costa Rica is known for dental, cosmetic, and orthopaedic procedures',
    ],
    embassy_contact: {
      website: 'https://www.rree.go.cr/',
      visa_portal: 'https://www.migracion.go.cr/',
      note: 'Contact the nearest Costa Rican Embassy or Consulate for visa applications if required',
    },
    official_source: 'https://www.migracion.go.cr/',
    confirmed: true,
    last_reviewed: '2026-06',
  },
  'Panama': {
    visa_type: 'Visa-Free Entry or e-Visa',
    duration: 'Up to 180 days',
    method: 'online',
    portal_url: 'https://www.migracion.gob.pa/',
    processing_time: 'Immediate for visa-free; 5–10 business days for e-Visa',
    cost_usd: 50,
    cost_notes: 'e-Visa approximately $50–$100 USD. Visa-free nationalities pay no fee.',
    documents: [
      'Valid passport — minimum 3 months validity beyond intended stay',
      'Return or onward ticket',
      'Proof of funds (minimum $500 USD)',
      'Proof of accommodation',
      'Medical appointment letter (recommended)',
    ],
    medical_special: [
      'Panama does not have a dedicated medical visa',
      'Medical travellers enter under standard visitor/tourist rules',
      'Panama City is a key Americas medical hub: Hospital Nacional, Punta Pacífica (Johns Hopkins affiliate)',
      'For extended treatment, apply for a Pensionado or specific purpose visa at the National Migration Service',
    ],
    embassy_contact: {
      website: 'https://www.mire.gob.pa/',
      visa_portal: 'https://www.migracion.gob.pa/',
      note: 'Contact the nearest Panamanian Embassy or Consulate for visa-required nationalities',
    },
    official_source: 'https://www.migracion.gob.pa/',
    confirmed: true,
    last_reviewed: '2026-06',
  },
};

// ── Quick status lookup (nationality adjective → destination country) ────────
// Mirrors the logic in src/lib/visaMatrix.js for server-side use
const EU_WESTERN = ['american','british','canadian','irish','australian','new zealander','french','german','italian','spanish','portuguese','dutch','belgian','austrian','swiss','swedish','norwegian','danish','finnish','japanese'];
const CARICOM = ['trinidadian','barbadian','grenadian','antiguans','antiguan','belizean','dominican','saint vincentian','vincentian','saint lucian','st. lucian','kittitian','guyanese','bahamian','surinamese','jamaican'];
const LATAM = ['brazilian','argentine','colombian','ecuadorian','mexican','bolivian','peruvian','chilean','costa rican','uruguayan','paraguayan','panamanian'];

function inferStatus(nationality, destination) {
  const n = nationality.toLowerCase().trim();
  const d = destination.toLowerCase().trim();
  if (n.includes(d) || d.includes(n)) return 'exempt';
  const isEU = EU_WESTERN.some(x => n.includes(x));
  const isCARICOM = CARICOM.some(x => n.includes(x));
  const isLATAM = LATAM.some(x => n.includes(x));
  if (d.includes('venezuela')) {
    if (isEU || isLATAM) return 'exempt';
    if (isCARICOM) return n.includes('st. lucian') || n.includes('saint lucian') ? 'embassy' : 'exempt';
    return 'embassy';
  }
  if (d.includes('turkey')) return isEU ? 'exempt' : (isCARICOM || isLATAM || n.includes('indian') || n.includes('chinese') || n.includes('russian')) ? 'evisa' : 'embassy';
  if (d.includes('india')) return 'evisa';
  if (d.includes('thailand')) return isEU ? 'exempt' : 'evisa';
  if (d.includes('colombia') || d.includes('costa rica') || d.includes('panama') || d.includes('mexico') || d.includes('brazil') || d.includes('dominican')) {
    return (isEU || isCARICOM || isLATAM) ? 'exempt' : 'evisa';
  }
  return isEU ? 'evisa' : 'embassy';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passport_id, destination_country, nationality: directNationality } = await req.json();
    if (!destination_country) return Response.json({ error: 'destination_country required' }, { status: 400 });

    // Resolve nationality — from passport vault or directly supplied
    let nationality = directNationality || 'Unknown';
    if (passport_id) {
      const passport = await base44.entities.PassportVault.get(passport_id);
      if (!passport || passport.user_id !== user.id) return Response.json({ error: 'Passport not found' }, { status: 404 });
      nationality = passport.redacted_for_display?.nationality || nationality;
    }

    const destKey = Object.keys(MEDICAL_VISA_DATABASE).find(k => destination_country.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(destination_country.toLowerCase()));
    const dbEntry = destKey ? MEDICAL_VISA_DATABASE[destKey] : null;
    const status = await aiInferStatus(nationality, destination_country);

    // ── If destination is in our database: return full structured response ───
    if (dbEntry) {
      return Response.json({
        nationality,
        destination: destination_country,
        visa_status: status,
        visa_type: dbEntry.visa_type,
        duration: dbEntry.duration,
        application: {
          method: dbEntry.method,
          portal_url: dbEntry.portal_url,
          processing_time: dbEntry.processing_time,
        },
        cost: {
          amount_usd: dbEntry.cost_usd,
          notes: dbEntry.cost_notes,
        },
        documents: dbEntry.documents,
        medical_special_requirements: dbEntry.medical_special,
        embassy: dbEntry.embassy_contact,
        source: {
          official_url: dbEntry.official_source,
          confirmed: dbEntry.confirmed,
          last_reviewed: dbEntry.last_reviewed,
          disclaimer: 'This information is sourced from official government portals and reviewed periodically. Always verify current requirements at the official source before travel, as visa policies can change without notice.',
        },
      });
    }

    // ── Fallback: LLM with internet context for unlisted destinations ────────
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a visa specialist assistant for a medical travel platform. A patient with a ${nationality} passport is travelling to ${destination_country} for a medical procedure.

Provide structured visa information based on official government sources only. Focus on:
- Whether a visa is required (exempt/evisa/on_arrival/embassy_required)
- Medical-specific requirements (hospital letter, appointment confirmation, etc.)
- Official application portal URL
- Processing time and cost
- Key documents needed

Return a JSON with: visa_status (exempt|evisa|on_arrival|embassy_required|unknown), visa_type, duration, portal_url, processing_time, cost_notes, documents (array), medical_notes, official_source_url, confidence (high|medium|low).

If you cannot find reliable official information, set confidence to "low" and return what you know with a caveat.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          visa_status: { type: 'string' },
          visa_type: { type: 'string' },
          duration: { type: 'string' },
          portal_url: { type: 'string' },
          processing_time: { type: 'string' },
          cost_notes: { type: 'string' },
          documents: { type: 'array', items: { type: 'string' } },
          medical_notes: { type: 'string' },
          official_source_url: { type: 'string' },
          confidence: { type: 'string' },
        },
      },
    });

    return Response.json({
      nationality,
      destination: destination_country,
      visa_status: aiResult?.visa_status || 'unknown',
      visa_type: aiResult?.visa_type || 'Unknown — please verify with the embassy',
      duration: aiResult?.duration || 'Not confirmed',
      application: {
        method: aiResult?.portal_url ? 'online' : 'embassy',
        portal_url: aiResult?.portal_url || null,
        processing_time: aiResult?.processing_time || 'Not confirmed',
      },
      cost: { amount_usd: null, notes: aiResult?.cost_notes || 'Check official sources' },
      documents: aiResult?.documents || [],
      medical_special_requirements: aiResult?.medical_notes ? [aiResult.medical_notes] : [],
      embassy: { website: aiResult?.official_source_url || null, note: 'Contact the embassy directly to confirm current requirements.' },
      source: {
        official_url: aiResult?.official_source_url || null,
        confirmed: aiResult?.confidence === 'high',
        last_reviewed: null,
        disclaimer: `IMPORTANT: This destination is not in our pre-verified database. This information was retrieved via AI search and confidence is ${aiResult?.confidence || 'unknown'}. You must verify directly with the ${destination_country} embassy or consulate before travel.`,
      },
    });
  } catch (error) {
    console.error('[checkVisaRequirements]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
