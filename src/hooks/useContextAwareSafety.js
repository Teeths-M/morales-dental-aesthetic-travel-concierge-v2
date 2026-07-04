/**
 * useContextAwareSafety — Silent Guardian Orchestrator
 *
 * Combines all four context layers into a single hook:
 *   Layer 1: Solo vs Group (from consultation data)
 *   Layer 2: Time of Day (useTimeOfDay)
 *   Layer 3: Activity Detection (useActivityDetection)
 *   Layer 4: Guardian Mode scheduler (useGuardianMode)
 *
 * Single import for Dashboard.jsx and anywhere else that needs
 * the full safety context.
 */
import { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTimeOfDay }         from './useTimeOfDay';
import { useActivityDetection } from './useActivityDetection';
import { useGuardianMode }      from './useGuardianMode';

export function useContextAwareSafety({
  consultationId,
  travelingSolo       = true,
  guardianModeOptedIn = false,
  companionType       = 'solo',
  isActiveJourney     = false,
  hasGPSMoved         = true,
  lastGPSUpdateAt     = null,
  destination         = null,
  procedure           = null,
}) {
  // ── Layer 2: Time of Day (zero hardware, zero battery) ──────────────────
  const timeOfDay = useTimeOfDay();

  // ── Layer 3: Activity Detection (only when active journey + opted in) ───
  const activityEnabled = isActiveJourney && guardianModeOptedIn && travelingSolo;
  const activity = useActivityDetection({
    enabled:    activityEnabled,
    hasGPSMoved,
  });

  // ── Layer 4: Guardian Mode Scheduler ────────────────────────────────────
  const guardian = useGuardianMode({
    consultationId,
    travelingSolo,
    guardianModeOptedIn,
    isActiveJourney,
    isNight:       timeOfDay.isNight,
    lastGPSUpdateAt,
  });

  // ── Layer 1: Solo sensitivity multiplier ─────────────────────────────────
  // solo = full Guardian Mode
  // partner_family = standard (check-ins halved, escalation threshold higher)
  // group = minimal (no individual monitoring, safety-by-proximity assumed)
  const sensitivityLevel = useMemo(() => {
    if (companionType === 'group')         return 'minimal';
    if (companionType === 'partner_family') return 'standard';
    return 'guardian'; // solo
  }, [companionType]);

  // Combined risk bonus from time + activity
  const totalRiskBonus = timeOfDay.riskBonus + (activity.strikeCount * 5);

  // AI safety recommendation — fires once when active journey starts, debounced 3s
  const [aiRecommendation, setAiRecommendation] = useState(null);
  useEffect(() => {
    if (!isActiveJourney || !destination) return;
    const t = setTimeout(() => {
      base44.functions.invoke('analyzeDestinationSafety', {
        country: destination,
        procedure: procedure || null,
        risk_score: totalRiskBonus,
      }).then(r => {
        const d = r?.data ?? r;
        if (d?.note) setAiRecommendation({ note: d.note, time_note: d.time_note });
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [isActiveJourney, destination, procedure]);

  return {
    // Layer 1
    sensitivityLevel,
    travelingSolo,
    companionType,

    // Layer 2
    ...timeOfDay,

    // Layer 3
    activity,

    // Layer 4
    guardian,

    // Combined
    totalRiskBonus,
    isFullGuardianMode: guardian.isGuardianMode,

    // AI
    aiRecommendation,
  };
}
