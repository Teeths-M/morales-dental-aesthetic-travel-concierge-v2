/**
 * useBehavioralTracking — MedGuard Pattern Intelligence
 *
 * Silent behavioral fingerprint engine. Zero integration credits during
 * normal operation — all signal recording is entity writes (free).
 * The analyzePatternAnomaly edge function only fires when dispatching nudges.
 *
 * Phase 1 (first 72h): Observe silently. Build fingerprint. No escalation.
 * Phase 2 (ongoing):   Compare behavior to baseline. Gentle nudges on deviation.
 *
 * Signals recorded:
 *   app_open   — component mounts (app opened / screen unlocked proxy)
 *   heartbeat  — periodic ping every 5 min while app is in foreground
 *   visibility — document visibility change (foreground ↔ background)
 *
 * Returns: { nudge, dismissNudge } — nudge is null or { message, action }
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isSystemPaused } from '@/lib/systemPause';

const LEARNING_HOURS     = 72;
const HEARTBEAT_MS       = 5 * 60 * 1000;   // 5 min
const ANALYSIS_INTERVAL  = 15 * 60 * 1000;  // 15 min between anomaly checks
const BUFFER_MAX         = 288;              // max 24h of 5-min heartbeats
const MIN_NUDGE_GAP_MIN  = 30;              // throttle nudges
const FP_CACHE_KEY       = 'morales_behavioral_fp'; // localStorage fingerprint backup

// ── LocalStorage fingerprint cache (survives entity write failures) ───────────
function loadCachedFingerprint(email) {
  try {
    const raw = localStorage.getItem(FP_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj.email === email ? obj.fp : null;
  } catch { return null; }
}
function saveCachedFingerprint(email, fp) {
  try { localStorage.setItem(FP_CACHE_KEY, JSON.stringify({ email, fp, ts: Date.now() })); } catch {}
}

// ── Fingerprint helpers ──────────────────────────────────────────────────────

function blankFingerprint() {
  return {
    app_opens_per_hour:      3,
    avg_session_duration_sec: 120,
    sleep_start_hour:        23,
    sleep_end_hour:          7,
    typical_charge_hours:    [22, 23, 0, 1],
    avg_offline_duration_min: 60,
    checkin_on_time_rate:    0.8,
    avg_checkin_delay_min:   5,
    samples_collected:       0,
    learning_completed_at:   null,
  };
}

// Exponential moving average — weights recent observations more
function ema(prev, next, samples) {
  const alpha = Math.min(0.4, 2 / (samples + 1));
  return prev * (1 - alpha) + next * alpha;
}

function isInSleepWindow(hour, start, end) {
  // Handles midnight wrap-around: start=23, end=7
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

// Update the running fingerprint with a new data point
function updateFingerprint(fp, signal) {
  const n = fp.samples_collected || 0;
  return {
    ...fp,
    app_opens_per_hour:       ema(fp.app_opens_per_hour, signal.opens_this_hour, n),
    avg_session_duration_sec: ema(fp.avg_session_duration_sec, signal.session_sec, n),
    avg_offline_duration_min: ema(fp.avg_offline_duration_min, signal.offline_min, n),
    // Update sleep window using detected inactivity periods
    sleep_start_hour: signal.inactive_start_hour != null
      ? Math.round(ema(fp.sleep_start_hour, signal.inactive_start_hour, n))
      : fp.sleep_start_hour,
    sleep_end_hour: signal.inactive_end_hour != null
      ? Math.round(ema(fp.sleep_end_hour, signal.inactive_end_hour, n))
      : fp.sleep_end_hour,
    // Track charging hours (hour of day when typically offline + reconnects)
    typical_charge_hours: signal.charge_hour != null
      ? [...new Set([...fp.typical_charge_hours, signal.charge_hour])].slice(-6)
      : fp.typical_charge_hours,
    samples_collected: n + 1,
  };
}

// ── Anomaly detection (client-side, zero credits) ────────────────────────────

function computeAnomaly(profile, context = {}) {
  const fp = profile?.fingerprint;
  if (!fp || profile.learning_phase || !profile.last_signal_at) {
    return { score: 0, action: 'learning', message: null, reason: null };
  }

  const now          = new Date();
  const currentHour  = now.getHours();
  const minutesSince = (now - new Date(profile.last_signal_at)) / 60000;
  const avgOffline   = fp.avg_offline_duration_min || 60;
  const inSleep      = isInSleepWindow(currentHour, fp.sleep_start_hour, fp.sleep_end_hour);
  const inCharge     = (fp.typical_charge_hours || []).includes(currentHour);

  let score   = 0;
  let message = null;
  let reason  = null;

  // ── 1. Offline duration ─────────────────────────────────────────────────
  if (minutesSince > avgOffline) {
    const ratio = minutesSince / avgOffline;

    if (inSleep) {
      // Expected — sleep window
      score += 0;
    } else if (inCharge) {
      // Probably charging — minimal concern
      score += 5;
      message = "Charging detected. We'll resume watch when you're back. Rest well.";
      reason  = 'charging';
    } else {
      score += Math.min(40, ratio * 14);
      if (ratio > 2.5) {
        reason  = 'offline_extended';
        message = "Your phone went offline longer than usual. All good?";
      }
    }
  }

  // ── 2. Missed check-ins ─────────────────────────────────────────────────
  const missed     = context.missedCheckins || 0;
  const minutesLate = context.minutesLate   || 0;
  if (missed > 0) {
    const reliability = fp.checkin_on_time_rate || 0.8;
    if (reliability > 0.85) {
      // Highly reliable user — a miss is a real signal
      score  += 40;
      reason  = 'missed_checkin_reliable_user';
      message = `Your check-in is ${minutesLate} min late. You're usually on time — tap 'I'm Safe' when you can.`;
    } else {
      score  += 18;
      reason  = 'missed_checkin';
      message = `Check-in overdue. Tap 'I'm Safe' when you can.`;
    }
  }

  // ── 3. Extended silence during normally active hours ────────────────────
  if (!inSleep && minutesSince > avgOffline * 3.5 && !inCharge) {
    score  += 22;
    reason  = reason || 'extended_silence_active_hours';
    message = message || "We noticed your pattern changed — just checking in. Tap 👍 if you're okay.";
  }

  // ── 4. Post-surgery context (expected immobility) ───────────────────────
  if (context.isRecoveryPhase) {
    score = Math.max(0, score - 20);
    if (score < 20) {
      message = null; // Don't nudge during expected recovery immobility
    }
  }

  // ── 5. Multi-factor escalation: missed + silence + unusual time ─────────
  if (missed > 0 && minutesSince > avgOffline * 2 && !inSleep && !inCharge) {
    score = Math.min(100, score + 20); // compound risk bonus
    reason = 'compound_risk';
  }

  // ── Action thresholds ───────────────────────────────────────────────────
  let action = 'normal';
  if (score >= 75) action = 'escalated';
  else if (score >= 45) action = 'check_in_requested';
  else if (score >= 20) action = 'soft_ping';

  return { score: Math.round(score), action, message, reason };
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useBehavioralTracking({ caseId, caseStatus } = {}) {
  const { user }          = useAuth();
  const [profile, setProfile] = useState(null);
  const [nudge, setNudge]     = useState(null);

  const sessionStartRef    = useRef(Date.now());
  const opensThisHourRef   = useRef(0);
  const lastAnalysisRef    = useRef(0);
  const profileRef         = useRef(null);
  const offlineStartRef    = useRef(null);

  // Keep profileRef in sync for use in callbacks
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Track if currently in recovery phase
  const isRecoveryPhase = ['Recovery', 'RECOVERY_PHASE_7_DAY', 'Procedure-In-Progress']
    .includes(caseStatus);

  // ── Load or create profile ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email || isSystemPaused()) return;

    async function loadProfile() {
      try {
        const rows = await base44.entities.BehavioralProfile.filter(
          { user_email: user.email }, '-created_date', 1
        );
        if (rows.length) {
          const p = rows[0];
          // Check if learning phase should end
          if (p.learning_phase && p.learning_started_at) {
            const hoursElapsed = (Date.now() - new Date(p.learning_started_at).getTime()) / 3600000;
            if (hoursElapsed >= LEARNING_HOURS && p.fingerprint?.samples_collected >= 5) {
              const updated = {
                ...p,
                learning_phase: false,
                status: 'monitoring',
                fingerprint: { ...p.fingerprint, learning_completed_at: new Date().toISOString() },
              };
              await base44.entities.BehavioralProfile.update(p.id, {
                learning_phase: false,
                status: 'monitoring',
                fingerprint: updated.fingerprint,
              }).catch(() => {});
              setProfile(updated);
              return;
            }
          }
          // Merge localStorage fingerprint cache if entity has fewer samples
          const cached = loadCachedFingerprint(user.email);
          if (cached && (cached.samples_collected || 0) > (p.fingerprint?.samples_collected || 0)) {
            p = { ...p, fingerprint: cached };
          }
          setProfile(p);
        } else {
          // First time — use cached fingerprint if available, otherwise blank
          const cached   = loadCachedFingerprint(user.email);
          const now      = new Date().toISOString();
          const created  = await base44.entities.BehavioralProfile.create({
            user_email:          user.email,
            case_id:             caseId || null,
            learning_phase:      !cached || (cached.samples_collected || 0) < 5,
            learning_started_at: now,
            fingerprint:         cached || blankFingerprint(),
            last_signal_at:      now,
            signals_buffer:      [],
            status:              cached ? 'monitoring' : 'learning',
            nudge_count:         0,
          }).catch(() => null);
          if (created) setProfile(created);
        }
      } catch { /* non-blocking */ }
    }

    loadProfile();
  }, [user?.email, caseId]);

  // ── Record signal ─────────────────────────────────────────────────────────
  const recordSignal = useCallback(async (type) => {
    if (!profileRef.current || isSystemPaused()) return;
    const p   = profileRef.current;
    const now = new Date();
    const nowIso = now.toISOString();

    // Build signal data point for fingerprint update
    const sessionSec  = (Date.now() - sessionStartRef.current) / 1000;
    const offlineMin  = offlineStartRef.current
      ? (Date.now() - offlineStartRef.current) / 60000
      : 0;

    let fp = p.fingerprint || blankFingerprint();
    if (p.learning_phase) {
      fp = updateFingerprint(fp, {
        opens_this_hour:  opensThisHourRef.current,
        session_sec:      sessionSec,
        offline_min:      offlineMin > 0 ? offlineMin : fp.avg_offline_duration_min,
        charge_hour:      offlineMin > 45 ? now.getHours() : null, // reconnect after long offline = charge cycle
      });
    }

    // Trim signal buffer to 24h
    const buffer = [...(p.signals_buffer || []), { ts: nowIso, type, h: now.getHours() }]
      .slice(-BUFFER_MAX);

    // Always save to localStorage first — survives entity write failures
    if (user?.email) saveCachedFingerprint(user.email, fp);

    try {
      const updated = await base44.entities.BehavioralProfile.update(p.id, {
        last_signal_at: nowIso,
        fingerprint:    fp,
        signals_buffer: buffer,
        anomaly_score:  type === 'app_open' ? 0 : p.anomaly_score,
        status: type === 'app_open' && p.status !== 'learning' ? 'monitoring' : p.status,
      });
      if (updated) setProfile(prev => ({ ...prev, ...updated, fingerprint: fp, last_signal_at: nowIso }));
    } catch { /* entity write failed — localStorage cache already saved */ }

    offlineStartRef.current = null;
    if (type === 'app_open') {
      opensThisHourRef.current += 1;
      sessionStartRef.current = Date.now();
    }
  }, []);

  // ── Anomaly check ─────────────────────────────────────────────────────────
  const runAnomalyCheck = useCallback(async () => {
    const p = profileRef.current;
    if (!p || p.learning_phase || isSystemPaused()) return;

    const now = Date.now();
    if (now - lastAnalysisRef.current < ANALYSIS_INTERVAL) return;
    lastAnalysisRef.current = now;

    const result = computeAnomaly(p, { isRecoveryPhase });

    if (result.action === 'normal' || result.action === 'learning') {
      setNudge(null);
      return;
    }

    // Throttle: don't re-show if nudge was recent
    if (p.last_nudge_at) {
      const minSince = (now - new Date(p.last_nudge_at).getTime()) / 60000;
      if (minSince < MIN_NUDGE_GAP_MIN) return;
    }

    // Show in-app nudge
    if (result.message) {
      setNudge({ message: result.message, action: result.action, score: result.score });
    }

    // Call edge function for push notification dispatch (only if > soft_ping)
    if (result.action === 'check_in_requested' || result.action === 'escalated') {
      try {
        await base44.functions.invoke('analyzePatternAnomaly', {
          profile_id:       p.id,
          case_id:          caseId || p.case_id,
          anomaly_score:    result.score,
          action:           result.action,
          nudge_message:    result.message,
          context_note:     `${result.reason} — score ${result.score}`,
          anomaly_reason:   result.reason,
          emergency_bypass: result.action === 'escalated', // critical escalations bypass System Pause
        });
      } catch { /* edge function dispatch failure is non-blocking */ }
    }

    // Update local state optimistically
    setProfile(prev => ({
      ...prev,
      anomaly_score: result.score,
      status:        result.action,
      last_nudge_at: new Date().toISOString(),
      nudge_count:   (prev?.nudge_count || 0) + 1,
    }));
  }, [caseId, isRecoveryPhase]);

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !user?.email) return;

    // Record app open
    recordSignal('app_open');

    const heartbeat = setInterval(() => {
      recordSignal('heartbeat');
      runAnomalyCheck();
    }, HEARTBEAT_MS);

    // Visibility change (background = phone locked / screen off proxy)
    function onVisibility() {
      if (document.hidden) {
        offlineStartRef.current = Date.now();
        recordSignal('background');
      } else {
        recordSignal('foreground');
        runAnomalyCheck();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profile?.id, user?.email, recordSignal, runAnomalyCheck]);

  const dismissNudge = useCallback(() => setNudge(null), []);

  return {
    profile,
    nudge,
    dismissNudge,
    isLearning: profile?.learning_phase ?? true,
    anomalyScore: profile?.anomaly_score ?? 0,
  };
}
