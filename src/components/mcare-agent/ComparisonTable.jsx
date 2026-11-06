import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ProviderStatusBadge from '@/components/mcare-agent/ProviderStatusBadge';

// Cap rows shown, matching getDecisionRoomSummary's own established 5-cap
// precedent for the same underlying data source -- a truncated list is
// honestly disclosed below the table, never silently dropped.
const MAX_ROWS = 5;

// One lookup per procedure per chat session, the same idea as
// ProcedureMediaCard's webIllustrationCache. Message bubbles re-render and
// remount often. Without this, every remount would re-run the match (an AI
// synonym call each time) and could show a different set of doctors than the
// first render did. Only successful lookups are stored, so a failed one can
// be retried by asking again.
const comparisonCache = new Map();
const cacheKey = (name) => String(name || '').trim().toLowerCase();

// Colours come from the theme (bg-card, border-border, text-muted-foreground), so the table matches whichever
// panel it sits in: the light laptop panel or the dark navy phone screen.
//
// Renders a real, structured comparison table for a {{comparetable:
// PROCEDURE_NAME}} token M-Care emits (see RULE 42 in m_care.jsonc). The
// component does its own live fetch against the exact same real
// matchDoctorsForProcedure function the agent already used to find these
// doctors in the first place -- the same live-fetch-at-render-time pattern
// ProcedureMediaCard already established for {{media:...}}. The model never
// has to type a single row of this table itself; every value shown is real,
// fetched data, never something an LLM transcribed, formatted, or guessed --
// this is what structurally guarantees RULE 3 (no invented data) for a
// multi-row, multi-column result.
//
// Display-only lookup: skip_outreach tells matchDoctorsForProcedure to skip
// its no-match doctor outreach emails, and the patient's email address is
// deliberately not sent at all. Drawing a table must never email anyone.
//
// No price column: matchDoctorsForProcedure never returns a price (price
// only ever exists per-quote, on a separate DoctorQuote record tied to a
// specific quote request) -- a real, disclosed scope boundary stated in
// RULE 42 itself, not an oversight. Every doctor this endpoint can return
// already cleared Morales's full verification pipeline by construction (see
// matchDoctorsForProcedure's own filter), so every row's trust tier is
// honestly always "approved" -- reusing ProviderStatusBadge's own tier
// config/colors rather than reinventing that mapping here.
export default function ComparisonTable({ procedureName }) {
  const { user } = useAuth();
  const signedIn = !!user;
  const key = cacheKey(procedureName);
  const [state, setState] = useState(() => {
    const hit = comparisonCache.get(key);
    return hit ? { status: 'ready', doctors: hit } : { status: 'loading', doctors: [] };
  });

  useEffect(() => {
    // matchDoctorsForProcedure requires a signed-in user. A signed-out
    // visitor gets the sign-in note below instead of a call that can only fail.
    if (!signedIn) return;
    const hit = comparisonCache.get(key);
    if (hit) {
      setState({ status: 'ready', doctors: hit });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading', doctors: [] });
    base44.functions.invoke('matchDoctorsForProcedure', {
      procedure_interest: procedureName,
      skip_outreach: true,
    })
      .then((res) => {
        if (cancelled) return;
        // base44.functions.invoke resolves to the raw axios response, not the
        // JSON body -- the real payload is res.data (see ProcedureMediaCard/
        // DriverMapWidget.jsx for the sibling bug this exact pattern caused
        // more than once elsewhere in this app before being fixed there).
        const body = res?.data;
        const doctors = Array.isArray(body?.matched_doctors) ? body.matched_doctors : [];
        comparisonCache.set(key, doctors);
        setState({ status: 'ready', doctors });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', doctors: [] }); });
    return () => { cancelled = true; };
  }, [key, procedureName, signedIn]);

  if (!signedIn) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Sign in to see this comparison.
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Building the comparison...
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        I couldn&apos;t build that comparison right now — please ask again in a moment.
      </div>
    );
  }

  if (state.doctors.length < 2) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Not enough matched providers to compare yet.
      </div>
    );
  }

  const rows = state.doctors.slice(0, MAX_ROWS);
  const overflow = state.doctors.length - rows.length;

  return (
    <div className="mt-2 max-w-full overflow-x-auto rounded-xl border border-border bg-card text-card-foreground">
      <table className="w-full min-w-[560px] text-left text-[11px]">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Doctor</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Location</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Rating</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Experience</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Track Record</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Next Available</th>
            <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Trust</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.id} className="border-b border-border last:border-b-0">
              <td className="px-2.5 py-2 font-medium">
                <div className="flex items-center gap-1.5">
                  {doc.photo_url && (
                    <img src={doc.photo_url} alt={doc.name} className="h-5 w-5 rounded-full object-cover flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[130px]">{doc.name || 'Unnamed'}</span>
                </div>
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                {[doc.clinic_city, doc.clinic_country].filter(Boolean).join(', ') || '—'}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                {doc.rating != null ? doc.rating : '—'}
                {doc.review_count != null && <span className="text-muted-foreground"> ({doc.review_count})</span>}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                {doc.years_experience != null ? `${doc.years_experience} yrs` : '—'}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                {doc.successful_procedures_count != null ? doc.successful_procedures_count : '—'}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                {doc.next_available_date || 'Not confirmed'}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                <ProviderStatusBadge tier="approved" name={null} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {overflow > 0 && (
        <p className="px-2.5 py-1.5 text-[11px] text-muted-foreground border-t border-border">
          +{overflow} more matched
        </p>
      )}
    </div>
  );
}
