import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Same 20s interval CaseThread.jsx already uses in production for a nearly
// identical "poll and render as chat bubbles" case — not a new, unproven cadence.
const JOURNEY_EVENT_POLL_MS = 20000;

/**
 * Polls JourneyEvent records for the patient's active case — the real,
 * persistent backend record a scheduled function (sendTravelCountdownReminders,
 * autoCompletePatientJourney) writes when it does something proactive. The
 * caller renders message_text as an M-Care chat bubble; this hook only fetches.
 */
export function useJourneyEvents(caseId) {
  return useQuery({
    queryKey: ['journeyEvents', caseId],
    queryFn: () => base44.entities.JourneyEvent.filter({ case_id: caseId }, '-created_date', 20).catch(() => []),
    enabled: !!caseId,
    refetchInterval: JOURNEY_EVENT_POLL_MS,
  });
}
