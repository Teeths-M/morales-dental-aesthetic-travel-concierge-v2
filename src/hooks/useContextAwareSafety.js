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
import { useMemo } from 'react';
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
  };
}
