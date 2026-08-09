// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * VoiceMessageRecorder — WhatsApp-style voice-message recording control for
 * M-Care's main chat panel (MCareOrb.jsx).
 *
 * Deliberately separate from VoiceInputButton.jsx, not a variant of it:
 * VoiceInputButton records → uploads → transcribes → fills the text input
 * (speech becomes text the user still reviews/sends). This component records
 * → lets the user preview/pause/discard → hands the raw audio Blob straight
 * to the caller via onSend(audioBlob, durationMs). It does NOT upload,
 * transcribe, or send anything itself — that stays MCareOrb's job (same
 * separation of concerns VoiceInputButton's own header comment describes:
 * "Renders only the [control]; success/failure are reported to the caller").
 * VoiceInputButton.jsx itself is untouched by this file.
 *
 * Recording mechanics follow VoiceInputButton.jsx's proven pattern exactly:
 * getUserMedia → `new MediaRecorder(stream)` (no explicit mimeType override,
 * so Chrome/Edge default to audio/webm) → collect chunks via
 * ondataavailable → assemble a Blob (type audio/webm) on stop. The first-use
 * "Allow microphone?" prompt reuses MicPermissionGate unchanged, with the
 * same open/blocked/onAllow/onCancel contract and the same discipline of
 * only calling getUserMedia from inside a real user-gesture handler
 * (onAllow / the idle tap once permission was already granted).
 *
 * Live waveform is driven by the real per-frame levels from
 * `startLevelMeter` (src/lib/voiceMessageAudio.js) — never a fabricated
 * animation. `generateWaveformBars` (same module) deliberately is NOT
 * imported here: it produces a static shape from a *finished* audio Blob,
 * which is display logic for the sent chat bubble — explicitly a separate
 * sibling task (MessageBubble.jsx) per this component's own scope ("record,
 * preview, hand off the raw blob"). Importing it here unused would also
 * trip this repo's lint-clean bar for no benefit.
 *
 * MAX_RECORDING_MS is deliberately longer than VoiceInputButton's 20s cap —
 * that cap exists to bound a short transcribed command; a voice *message*
 * is meant to carry a full spoken thought, so this uses 2 minutes instead.
 * The cap tracks actual *recorded* time (pausing suspends the countdown,
 * resuming re-arms it with only the remaining budget) since a paused mic
 * isn't capturing anything the cap needs to guard against.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Trash2, Pause, Play, Send } from 'lucide-react';
import MicPermissionGate from '@/components/mcare/MicPermissionGate';
import { startLevelMeter } from '@/lib/voiceMessageAudio';

const MAX_RECORDING_MS = 120000; // 2 minutes — a real voice note, not a short command capture
const BAR_COUNT = 24;

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const pauseSupported = typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.prototype?.pause === 'function';

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Plain-English explanation for why getUserMedia failed — same reasoning as
// VoiceInputButton.jsx's private helper, kept as its own local copy since
// this component must stay self-contained (that file is not touched).
function explainMicError(e) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return 'This browser does not support voice messages.';
  }
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    if (window.self !== window.top) {
      return 'Microphone is blocked inside this preview frame. Open the app in its own browser tab, then allow microphone access when prompted.';
    }
    return 'Microphone access was blocked. Tap the camera icon in your browser address bar, allow microphone, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No microphone found on this device.';
  if (name === 'NotReadableError') return 'Another app is using the microphone. Close it and try again.';
  return 'Could not access the microphone. ' + (e?.message || 'Please check your device settings.');
}

export default function VoiceMessageRecorder({ onSend, onError, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState(() => Array(BAR_COUNT).fill(0));
  const [showGate, setShowGate] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const meterStopRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const maxTimerRef = useRef(null);
  const permissionGrantedRef = useRef(false);
  const stopActionRef = useRef(null); // 'send' | 'discard'
  const finalDurationRef = useRef(0);
  const startTimeRef = useRef(null);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(null);
  const pausedRef = useRef(false); // mirrors `paused` state for use inside the onLevel callback closure

  const clearTimers = () => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    tickIntervalRef.current = null;
    maxTimerRef.current = null;
  };

  const stopMeter = () => {
    meterStopRef.current?.();
    meterStopRef.current = null;
  };

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const durationSoFarMs = () => {
    if (!startTimeRef.current) return 0;
    const end = pausedRef.current && pauseStartRef.current ? pauseStartRef.current : Date.now();
    return Math.max(0, end - startTimeRef.current - pausedAccumRef.current);
  };

  const armMaxTimer = (remainingMs) => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => {
      // Auto-stop at the cap and hand off automatically — mirrors
      // VoiceInputButton's auto-stop-and-process behavior so a forgotten
      // open mic doesn't just hang mid-recording indefinitely.
      triggerSend();
    }, Math.max(0, remainingMs));
  };

  const resetToIdle = () => {
    clearTimers();
    mediaRecorderRef.current = null;
    setRecording(false);
    setPaused(false);
    pausedRef.current = false;
    setFinalizing(false);
    setElapsedMs(0);
    setLevels(Array(BAR_COUNT).fill(0));
  };

  const handleRecorderStop = () => {
    stopMeter();
    stopStreamTracks();
    const action = stopActionRef.current;
    stopActionRef.current = null;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];
    const duration = finalDurationRef.current;
    resetToIdle();

    if (action === 'send') {
      if (blob.size === 0) {
        onError?.("Recording was empty — try again.");
        return;
      }
      onSend?.(blob, duration);
    }
    // action === 'discard' → nothing further, UI is already back to idle.
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.('Voice messages are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionGrantedRef.current = true;
      setPermissionBlocked(null);
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = handleRecorderStop;
      mediaRecorderRef.current = recorder;
      recorder.start();

      startTimeRef.current = Date.now();
      pausedAccumRef.current = 0;
      pauseStartRef.current = null;
      setElapsedMs(0);
      setPaused(false);
      pausedRef.current = false;
      setFinalizing(false);
      setLevels(Array(BAR_COUNT).fill(0));
      setRecording(true);

      tickIntervalRef.current = setInterval(() => setElapsedMs(durationSoFarMs()), 200);
      armMaxTimer(MAX_RECORDING_MS);

      meterStopRef.current = startLevelMeter(stream, (level) => {
        if (pausedRef.current) return; // freeze the waveform while paused instead of animating on silence
        const clamped = Math.max(0, Math.min(1, level));
        setLevels((prev) => [...prev.slice(1), clamped]);
      });
    } catch (e) {
      const reason = explainMicError(e);
      stopStreamTracks();
      // Surface a toast AND re-open the permission gate with clear enable
      // steps, same recovery pattern as VoiceInputButton.jsx.
      onError?.(reason);
      setPermissionBlocked(reason);
      setShowGate(true);
    }
  };

  const triggerSend = () => {
    if (finalizing) return;
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      onError?.('Nothing recorded yet.');
      return;
    }
    finalDurationRef.current = durationSoFarMs();
    stopActionRef.current = 'send';
    setFinalizing(true);
    clearTimers();
    try {
      mediaRecorderRef.current.stop();
    } catch (_) {
      setFinalizing(false);
      onError?.('Could not finish the recording. Please try again.');
      resetToIdle();
    }
  };

  const triggerDiscard = () => {
    if (finalizing) return;
    stopActionRef.current = 'discard';
    setFinalizing(true);
    clearTimers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {
        stopMeter();
        stopStreamTracks();
        chunksRef.current = [];
        resetToIdle();
      }
    } else {
      stopMeter();
      stopStreamTracks();
      chunksRef.current = [];
      resetToIdle();
    }
  };

  const handlePauseResume = () => {
    if (!pauseSupported || finalizing) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (!pausedRef.current) {
      try {
        recorder.pause();
      } catch (_) {
        return; // pause() not actually usable on this browser despite the capability check — leave state untouched
      }
      pauseStartRef.current = Date.now();
      setPaused(true);
      pausedRef.current = true;
      if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
      if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; } // don't burn the cap while paused
    } else {
      try {
        recorder.resume();
      } catch (_) {
        return;
      }
      pausedAccumRef.current += Date.now() - (pauseStartRef.current || Date.now());
      pauseStartRef.current = null;
      setPaused(false);
      pausedRef.current = false;
      tickIntervalRef.current = setInterval(() => setElapsedMs(durationSoFarMs()), 200);
      armMaxTimer(MAX_RECORDING_MS - durationSoFarMs());
    }
  };

  const handleIdleClick = () => {
    if (disabled) return;
    // First time → show the "Allow microphone" gate (like Zoom / Meet).
    // After a successful grant we skip it on later taps.
    if (!permissionGrantedRef.current) {
      setPermissionBlocked(null);
      setShowGate(true);
      return;
    }
    startRecording();
  };

  // Unmount safety net: never leave a live mic stream or timer running.
  useEffect(() => {
    return () => {
      clearTimers();
      stopMeter();
      stopStreamTracks();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) { /* already stopping */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {!recording ? (
        <button
          type="button"
          onClick={handleIdleClick}
          disabled={disabled}
          title="Record a voice message"
          aria-label="Record a voice message"
          style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: '#F6F7FB',
            border: '1px solid #E5E7EB',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <Mic style={{ width: 16, height: 16, color: GOLD }} />
        </button>
      ) : (
        <div
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: '6px 10px', height: 40, boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={triggerDiscard}
            disabled={disabled || finalizing}
            title="Delete recording"
            aria-label="Delete recording"
            style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(239,68,68,0.12)', border: 'none',
              cursor: disabled || finalizing ? 'default' : 'pointer',
              opacity: disabled || finalizing ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Trash2 style={{ width: 13, height: 13, color: '#F87171' }} />
          </button>

          <span
            className={paused ? undefined : 'animate-pulse'}
            aria-hidden="true"
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 12, fontWeight: 600, color: '#E5E7EB', minWidth: 34,
              fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}
          >
            {formatDuration(elapsedMs)}
          </span>

          <div
            aria-hidden="true"
            style={{ flex: 1, minWidth: 0, height: 26, display: 'flex', alignItems: 'center', gap: 2 }}
          >
            {levels.map((lvl, i) => (
              <div
                key={i}
                style={{
                  flex: 1, minWidth: 1, maxWidth: 4,
                  height: Math.max(3, Math.round(lvl * 22)),
                  borderRadius: 2, background: GOLD,
                  transition: 'height 90ms linear',
                }}
              />
            ))}
          </div>

          {pauseSupported && (
            <button
              type="button"
              onClick={handlePauseResume}
              disabled={disabled || finalizing}
              title={paused ? 'Resume recording' : 'Pause recording'}
              aria-label={paused ? 'Resume recording' : 'Pause recording'}
              style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(212,175,55,0.14)', border: `1px solid ${BORDER}`,
                cursor: disabled || finalizing ? 'default' : 'pointer',
                opacity: disabled || finalizing ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {paused
                ? <Play style={{ width: 12, height: 12, color: GOLD }} />
                : <Pause style={{ width: 12, height: 12, color: GOLD }} />}
            </button>
          )}

          <button
            type="button"
            onClick={triggerSend}
            disabled={disabled || finalizing}
            title="Send voice message"
            aria-label="Send voice message"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: GOLD, border: 'none',
              cursor: disabled || finalizing ? 'default' : 'pointer',
              opacity: disabled || finalizing ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send style={{ width: 15, height: 15, color: '#060B16' }} />
          </button>
        </div>
      )}

      <MicPermissionGate
        open={showGate}
        blocked={permissionBlocked}
        onAllow={() => { setShowGate(false); startRecording(); }}
        onCancel={() => { setShowGate(false); setPermissionBlocked(null); }}
      />
    </>
  );
}
