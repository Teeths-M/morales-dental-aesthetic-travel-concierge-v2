/**
 * audioAmplitude — a real amplitude/RMS meter for a live-playing `<audio>`
 * element, so the robot avatar's speaking-state eye-glow/waveform can react
 * to M-Care's own real voice instead of only ever running the honest fixed
 * keyframe fallback (RobotAvatarImage.jsx's `amplitude` prop, `null` when
 * no real signal exists).
 *
 * The mic-input equivalent (`startLevelMeter` in voiceMessageAudio.js,
 * built for the WhatsApp-style voice-message recorder) is NOT duplicated
 * here — it already does exactly this for a `MediaStream`, is already
 * proven in production, and is reused directly for the "listening" case.
 * This file exists only for the one thing that's genuinely different: a
 * live `<audio>` *element* (TTS playback), not a `MediaStream`.
 *
 * The one real, non-obvious risk with this specific technique: calling
 * `AudioContext.createMediaElementSource(audioEl)` REROUTES that element's
 * audio output into the Web Audio graph — from that point on, the element
 * plays NOTHING through the normal `<audio>` pipeline unless the graph is
 * explicitly reconnected onward to `audioContext.destination`. Skipping
 * that reconnect would silently mute every neural-TTS reply, a far worse
 * regression than the eyes just not reacting to volume — so this file
 * always wires `source -> analyser -> destination` (the analyser is a
 * transparent pass-through node, it doesn't affect what's heard), never
 * `source -> analyser` alone.
 *
 * Fully best-effort by design: any failure (no AudioContext, the element
 * already has a source node attached, browser refuses the connection)
 * returns a no-op stop() and never calls onLevel — the caller's real
 * playback (`audio.play()`) is untouched either way, since this file never
 * gets the chance to run before that call, and never throws into it.
 */

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || /** @type {any} */ (window).webkitAudioContext || null;
}

// Matches voiceMessageAudio.js's own tick rate — a UI-facing meter has no
// reason to sample faster than the eye can perceive.
const METER_TICK_INTERVAL_MS = 1000 / 20;

/**
 * @param {HTMLAudioElement} audioEl
 * @param {(level: number) => void} onLevel
 * @returns {() => void} stop
 */
export function attachAudioElementAmplitudeMeter(audioEl, onLevel) {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor || !audioEl) return () => {};

  let audioContext;
  let source;
  let analyser;
  try {
    audioContext = new AudioContextCtor();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source = audioContext.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioContext.destination); // keep the real audio audible
  } catch {
    try { audioContext?.close(); } catch { /* no-op */ }
    return () => {};
  }

  const data = new Uint8Array(analyser.fftSize);
  let rafId = null;
  let stopped = false;
  let lastTickAt = 0;

  const tick = (now) => {
    if (stopped) return;
    if (now - lastTickAt >= METER_TICK_INTERVAL_MS) {
      lastTickAt = now;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      onLevel(Math.min(1, Math.sqrt(sumSquares / data.length)));
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    try { source.disconnect(); } catch { /* no-op */ }
    try { analyser.disconnect(); } catch { /* no-op */ }
    try { audioContext.close(); } catch { /* no-op */ }
  };
}
