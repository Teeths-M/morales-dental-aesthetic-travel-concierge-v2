// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling mcare components
/**
 * VoiceInputButton — voice as a first-class input for M-Care (Phase 2B).
 *
 * Deliberately built on MediaRecorder + server-side transcription
 * (transcribeVoiceInput, itself a thin sibling of the already-proven
 * walkieTalkieTranslate pipeline) rather than the browser's
 * SpeechRecognition API that VoiceMode.jsx/VisaWizard.jsx use — recognition
 * has zero Firefox support and inconsistent iOS Safari support (both of
 * those components already fall back to manual text for exactly that
 * reason); record-then-transcribe works the same everywhere a microphone
 * does. Renders only the button — success/failure are reported to the
 * caller via callbacks so each parent (MCareOrb's chat input,
 * BookingIntentEntry's one-shot box) can show it in its own existing UI
 * rather than this component inventing a third error-display pattern.
 *
 * Known real gap, not fixed here: the packaged native Android app has no
 * RECORD_AUDIO permission declared, so mic access will silently fail there
 * until android/app/src/main/AndroidManifest.xml is updated (same bug class
 * already hit once for GPS permissions in this app).
 */
import React, { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_RECORDING_MS = 20000;

export default function VoiceInputButton({ onTranscript, onError, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const maxDurationTimerRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleStop = async () => {
    stopStream();
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];
    if (blob.size === 0) return;

    setBusy(true);
    try {
      const file = new File([blob], 'voice-input.webm', { type: blob.type || 'audio/webm' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('transcribeVoiceInput', { audio_url: uploadRes.file_url });
      const payload = res?.data ?? res ?? {};
      if (payload.text) {
        onTranscript?.(payload.text);
      } else {
        onError?.("Didn't catch that — try again or type instead.");
      }
    } catch (_) {
      onError?.("Couldn't transcribe that — try again or type instead.");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.('Voice input is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = handleStop;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      // Auto-stop so a forgotten open mic doesn't record indefinitely.
      maxDurationTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (_) {
      onError?.('Mic access blocked — check your browser/device permissions.');
      stopStream();
    }
  };

  const stopRecording = () => {
    clearTimeout(maxDurationTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleClick = () => {
    if (disabled || busy) return;
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      title={recording ? 'Stop recording' : 'Speak instead'}
      aria-label={recording ? 'Stop recording' : 'Speak instead'}
      style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: recording ? '#dc2626' : 'rgba(255,255,255,0.06)',
        border: 'none',
        cursor: disabled || busy ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}
    >
      {busy
        ? <Loader2 style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.5)' }} className="animate-spin" />
        : recording
          ? <Square style={{ width: 13, height: 13, color: '#fff' }} />
          : <Mic style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.7)' }} />}
    </button>
  );
}
