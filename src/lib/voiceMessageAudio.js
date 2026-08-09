/**
 * voiceMessageAudio — Web Audio API primitives for M-Care's WhatsApp-style
 * voice messages: a live mic-level meter while recording, and a static
 * waveform envelope for a finished recording's preview/playback bubble.
 * This is the first real audio-reactive waveform code in this repo — the
 * only prior Web Audio usage is VoiceMode.jsx's cosmetic Math.random()
 * "waveform" (ignored here) and RecoveryModePanel.jsx's OscillatorNode
 * chime (unrelated).
 *
 * Same pure-helper/isolated-impure-wrapper split as talkMode.js and
 * conversationalMode.js: computeWaveformBars is a pure, unit-tested
 * function; startLevelMeter and generateWaveformBars are isolated, impure
 * AudioContext-dependent wrappers around it — jsdom (this repo's test
 * environment) doesn't implement real Web Audio decoding, so those two
 * aren't unit-tested beyond feature detection, matching this repo's stated
 * precedent (neuralSpeech.js, conversationalMode.js's
 * startContinuousRecognition).
 */

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || /** @type {any} */ (window).webkitAudioContext || null;
}

// ~20fps is plenty smooth for a UI level meter — no reason to compute RMS
// on every one of 60 animation frames per second when the bars only need to
// look continuous to the eye.
const METER_TICK_INTERVAL_MS = 1000 / 20;

/**
 * Starts a live mic-level meter on `stream` (the same MediaStream a
 * MediaRecorder is already recording from), calling onLevel(level) on every
 * tick with a 0-1 RMS amplitude value.
 *
 * Returns a stop() function that cancels the animation-frame loop and
 * closes the AudioContext — a caller starting/stopping recording repeatedly
 * must never accumulate live AudioContexts.
 *
 * If this browser has no AudioContext at all, returns a no-op stop() and
 * never calls onLevel — the caller treats "no live meter" as an acceptable
 * degraded state, not a crash.
 *
 * @param {MediaStream} stream
 * @param {(level: number) => void} onLevel
 * @returns {() => void}
 */
export function startLevelMeter(stream, onLevel) {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor || !stream) return () => {};

  let audioContext;
  let source;
  let analyser;
  try {
    audioContext = new AudioContextCtor();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
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

/**
 * Pure: given a decoded channel's samples (a Float32Array from
 * AudioBuffer.getChannelData, or any array-like of signed amplitudes) and a
 * target bar count, computes a peak-amplitude envelope normalized so the
 * loudest bar is close to 1 — raw decoded amplitudes are often tiny, and a
 * bar chart of unnormalized values would look visually flat.
 *
 * Falls back to a flat/neutral array (barCount copies of 0.3) for empty
 * input or a silent (all-zero) recording, rather than dividing by zero.
 *
 * @param {ArrayLike<number>} samples
 * @param {number} [barCount]
 * @returns {number[]}
 */
export function computeWaveformBars(samples, barCount = 40) {
  const count = Math.max(1, Math.floor(barCount) || 40);
  const flat = () => Array(count).fill(0.3);
  if (!samples || samples.length === 0) return flat();

  const segmentSize = Math.max(1, Math.floor(samples.length / count));
  const bars = [];
  for (let i = 0; i < count; i += 1) {
    const start = i * segmentSize;
    const end = i === count - 1 ? samples.length : Math.min(samples.length, start + segmentSize);
    let peak = 0;
    for (let j = start; j < end; j += 1) {
      const abs = Math.abs(samples[j]);
      if (abs > peak) peak = abs;
    }
    bars.push(peak);
  }

  const maxBar = Math.max(...bars);
  if (!maxBar || !Number.isFinite(maxBar)) return flat();
  return bars.map((v) => Math.min(1, v / maxBar));
}

/**
 * Decodes a finished recording (an audio/webm Blob, matching this app's
 * existing MediaRecorder call sites — see VoiceInputButton.jsx) into a
 * static waveform envelope: barCount numbers, each 0-1, for a
 * record-preview state and a sent-message playback bubble to render as
 * bars.
 *
 * Never rejects — any decode failure (corrupt blob, unsupported codec, no
 * AudioContext support) resolves to a flat/neutral array instead, so a
 * calling UI component can always render something rather than crashing.
 *
 * @param {Blob} audioBlob
 * @param {number} [barCount]
 * @returns {Promise<number[]>}
 */
export async function generateWaveformBars(audioBlob, barCount = 40) {
  const count = Math.max(1, Math.floor(barCount) || 40);
  const flat = () => Array(count).fill(0.3);

  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor || !audioBlob) return flat();

  let audioContext;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    audioContext = new AudioContextCtor();
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    return computeWaveformBars(decoded.getChannelData(0), count);
  } catch {
    return flat();
  } finally {
    try { await audioContext?.close(); } catch { /* no-op */ }
  }
}
