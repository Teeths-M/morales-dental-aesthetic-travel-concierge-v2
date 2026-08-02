import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { createMemoCache } from '../../shared/memoCache.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// ── Roster cache ─────────────────────────────────────────────────────────────
// The active/verified doctor roster + specialty list changes on the order of
// hours-to-days (doctor onboarding, admin approval), not per-request. A 5-min
// TTL on a warm isolate absorbs repeated intake-session lookups without ever
// serving anything past that window — see _shared/memoCache.ts.
const ROSTER_CACHE_TTL_MS = 5 * 60 * 1000;

async function buildDoctorRoster(base44: ReturnType<typeof createClientFromRequest>) {
  // BUG-R17-01 FIX: use asServiceRole — Doctor and DoctorSpecialty records are owned
  // by doctor users, not by the calling user. User-scoped entities returns empty for
  // cross-user data, so every procedure match returned 0 doctors and triggered unnecessary
  // outreach emails.
  const activeDoctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }, '-created_date', 500);

  // SECURITY: status='active' is a necessary but NOT sufficient condition.
  // A doctor can have status='active' with verification_status='failed' if a bug or
  // admin override set them active without completing all checks.
  // Only doctors in a definitively approved terminal state reach patients.
  const VERIFIED_STATUSES = new Set(['verified', 'auto_verified', 'manually_approved']);
  const allDoctors = activeDoctors.filter((doc: any) =>
    doc.license_verified === true &&
    VERIFIED_STATUSES.has(doc.verification_status)
  );

  // Get doctor procedures — bounded query with early termination
  const doctorProcedures = await base44.asServiceRole.entities.DoctorSpecialty.list('-created_date', 2000); // Bounded to 2000

  return { allDoctors, doctorProcedures };
}

const getDoctorRoster = createMemoCache(buildDoctorRoster, ROSTER_CACHE_TTL_MS);

// Expands a patient's search term to clinical synonyms so "nose job" finds "rhinoplasty"
async function expandSynonyms(term: string): Promise<string[]> {
  if (!ANTHROPIC_KEY) return [term.toLowerCase()];
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 60, messages: [{ role: 'user', content: `List 3-5 medical/clinical synonyms for "${term}" as a JSON array of lowercase strings. Array only, no other text.` }] }),
    });
    if (!r.ok) return [term.toLowerCase()];
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').match(/\[[\s\S]*?\]/);
    if (!m) return [term.toLowerCase()];
    const synonyms = JSON.parse(m[0]);
    return [...new Set([term.toLowerCase(), ...synonyms.map((s: unknown) => String(s).toLowerCase())])];
  } catch { return [term.toLowerCase()]; }
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedure_interest, client_email, client_id } = await req.json();

    if (!procedure_interest) {
      return Response.json({ error: 'Procedure interest required' }, { status: 400 });
    }

    // PERFORMANCE: Bounded queries with indexes — prevents OOM at scale.
    // Cached (see buildDoctorRoster/getDoctorRoster above) — this roster changes
    // on the order of hours-to-days, not per-request.
    const { allDoctors, doctorProcedures } = await getDoctorRoster(base44);

    // AI synonym expansion — "nose job" → ["rhinoplasty","nasal surgery",...] so no patient goes unmatched
    const searchTerms = await expandSynonyms(procedure_interest);

    // Match doctors to procedure using all synonyms
    const matchedDoctors = allDoctors.filter(doctor => {
      const specialties = doctorProcedures.filter(dp => dp.doctor_id === doctor.id);
      return specialties.some(sp =>
        searchTerms.some(term => sp.procedure_name?.toLowerCase().includes(term))
      );
    });

    // If no doctors found, trigger email outreach
    if (matchedDoctors.length === 0) {
      // PERFORMANCE: Bounded query — prevents full-table scan
      const relatedSpecialties = await base44.entities.DoctorSpecialty.list('-created_date', 500);
      
      // Get unique doctor emails to notify — bounded to prevent email spam
      const doctorsToNotify = new Set();
      relatedSpecialties.slice(0, 50).forEach(spec => { // Max 50 emails
        if (spec.specialty && !doctorsToNotify.has(spec.doctor_email)) {
          doctorsToNotify.add(spec.doctor_email);
        }
      });

      // Send outreach emails
      const emailPromises = Array.from(doctorsToNotify).map(async (doctorEmail) => {
        try {
          // BUG-R17-01 FIX: use asServiceRole for integrations in admin/system functions
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: doctorEmail,
            subject: `New Client Interested in ${procedure_interest}`,
            body: `Hi Doctor,

A new client (${client_email}) has registered and is interested in: ${procedure_interest}

Do you offer this procedure? If yes, you can add it to your profile to be matched with this client.

Add procedures here: ${Deno.env.get('APP_URL') || 'https://app.base44.com'}/doctor-dashboard

Thank you,
SAFE-T 4LIFE™ Team`
          });
          
          // Log the outreach
          await base44.entities.DoctorProcedureOutreach.create({
            procedure_name: procedure_interest,
            client_email: client_email,
            doctor_email: doctorEmail,
            email_sent_at: new Date().toISOString(),
            status: 'pending'
          }).catch(() => {}); // Ignore if entity doesn't exist yet
          
        } catch (e) {
          console.error('Failed to send outreach email:', e.message);
        }
      });

      await Promise.all(emailPromises);

      return Response.json({
        matched_doctors: [],
        outreach_sent: true,
        message: `No doctors found for ${procedure_interest}. We've notified our network and will update you when a specialist joins.`
      });
    }

    // Real next-availability lookup — bounded to the first 10 matches to avoid
    // an unbounded query fan-out; doctors beyond that (or with no upcoming
    // record) simply get next_available_date: null, same graceful-absence
    // pattern as a doctor missing a rating.
    const today = new Date().toISOString().slice(0, 10);
    const doctorsToEnrich = matchedDoctors.slice(0, 10);
    const availabilityByDoctorId: Record<string, string | null> = {};
    await Promise.all(doctorsToEnrich.map(async (doc) => {
      try {
        const slots = await base44.asServiceRole.entities.DoctorAvailability.filter({
          doctor_id: doc.id,
          is_available: true,
        });
        const upcoming = slots
          .filter((s: { date?: string }) => s.date && s.date >= today)
          .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
        availabilityByDoctorId[doc.id] = upcoming[0]?.date || null;
      } catch {
        availabilityByDoctorId[doc.id] = null;
      }
    }));

    // Return matched doctors
    return Response.json({
      matched_doctors: matchedDoctors.map(doc => ({
        id: doc.id,
        name: doc.full_name,
        clinic_country: doc.clinic_country,
        clinic_city: doc.clinic_city,
        rating: doc.rating,
        years_experience: doc.years_experience,
        photo_url: doc.photo_url,
        review_count: doc.review_count,
        successful_procedures_count: doc.successful_procedures_count,
        language_preference: doc.language_preference,
        next_available_date: availabilityByDoctorId[doc.id] ?? null
      })),
      outreach_sent: false,
      message: `Found ${matchedDoctors.length} specialist(s) for ${procedure_interest}`
    });

  } catch (error) {
    // BUG-R17-02 FIX: SEC-10
    console.error('[matchDoctorsForProcedure]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'matchDoctorsForProcedure', requireAuth: false }));
