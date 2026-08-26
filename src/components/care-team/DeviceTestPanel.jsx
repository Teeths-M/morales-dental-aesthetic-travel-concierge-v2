import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, CheckCircle2, XCircle } from 'lucide-react';

/**
 * DeviceTestPanel — pure getUserMedia + a canvas level-meter, no vendor.
 * Lets the patient/doctor confirm their camera and mic work before joining.
 */
export default function DeviceTestPanel({ onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | testing | ok | error
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const startTest = async () => {
    setStatus('testing');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Simple level meter on the audio track — a canvas bar, no library.
      const AudioContextCtor = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        if (!streamRef.current) { audioCtx.close().catch(() => {}); return; }
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 200, 20);
          ctx.fillStyle = '#2A3F4A';
          ctx.fillRect(0, 0, 200, 20);
          ctx.fillStyle = '#D4AF37';
          ctx.fillRect(0, 0, Math.min(200, (avg / 255) * 200), 20);
        }
        requestAnimationFrame(draw);
      };
      draw();
      setStatus('ok');
    } catch (e) {
      setStatus('error');
      setError(e?.message || 'Could not access camera/microphone.');
    }
  };

  return (
    <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Device test</p>

      {status === 'idle' && (
        <button
          type="button"
          onClick={startTest}
          style={{ background: '#D4AF37', color: '#060B16', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          Test my camera & microphone
        </button>
      )}

      {status === 'testing' && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Requesting camera/microphone access…</p>}

      {status === 'ok' && (
        <div>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: 200, borderRadius: 10, background: '#000' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
            <Mic size="14" color="#D4AF37" />
            <canvas ref={canvasRef} width={200} height={20} style={{ borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 12.5 }}>
            <CheckCircle2 size="16" /> Camera and microphone working.
          </div>
          <button
            type="button"
            onClick={() => { stop(); onComplete?.(); }}
            style={{ marginTop: 12, background: '#D4AF37', color: '#060B16', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Done — mark device test complete
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FCA5A5', fontSize: 12.5 }}>
          <XCircle size="16" /> {error} Check your browser's camera/microphone permissions.
        </div>
      )}
    </div>
  );
}
