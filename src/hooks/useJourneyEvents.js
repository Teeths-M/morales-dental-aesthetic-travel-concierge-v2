import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Same 20s interval CaseThread.jsx already uses in production for a nearly
// identical "poll and render as chat bubbles" case — not a new, unproven
// cadence. Kept as a safety net now that a live subscription (below) is the
// primary delivery path: if the socket ever misses an event, the next tick
// still catches it, so this can only make delivery faster, never less
// reliable.
const JOURNEY_EVENT_POLL_MS = 20000;

/**
 * Polls JourneyEvent records for the patient's active case — the real,
 * persistent backend record a scheduled function (sendTravelCountdownReminders,
 * autoCompletePatientJourney) writes when it does something proactive. The
 * caller renders message_text as an M-Care chat bubble; this hook only fetches.
 *
 * Also subscribes to real-time updates on the same entity, the same
 * base44.entities.<Entity>.subscribe() WebSocket channel already proven in
 * production for SOSEvent (AdminSosSyncMonitor.jsx) and CaseMessage/
 * DigitalHandshake (HeartNotificationCenter.jsx) — so a new JourneyEvent a
 * cron function just wrote lands the instant it happens instead of waiting
 * up to JOURNEY_EVENT_POLL_MS for the next poll tick.
 */
export function useJourneyEvents(caseId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['journeyEvents', caseId],
    queryFn: () => base44.entities.JourneyEvent.filter({ case_id: caseId }, '-created_date', 20).catch(() => []),
    enabled: !!caseId,
    refetchInterval: JOURNEY_EVENT_POLL_MS,
  });

  useEffect(() => {
    if (!caseId) return undefined;
    const unsub = base44.entities.JourneyEvent.subscribe((event) => {
      if (!event?.data || event.data.case_id !== caseId) return;
      if (event.type !== 'create' && event.type !== 'update') return;
      queryClient.setQueryData(['journeyEvents', caseId], (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const idx = list.findIndex((e) => e.id === event.data.id);
        if (idx === -1) return [event.data, ...list].slice(0, 20);
        const next = [...list];
        next[idx] = event.data;
        return next;
      });
    });
    return unsub;
  }, [caseId, queryClient]);

  return query;
}