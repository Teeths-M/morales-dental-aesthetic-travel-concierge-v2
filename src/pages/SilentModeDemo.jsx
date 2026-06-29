import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldOff, Shield, MapPin, Wifi, WifiOff } from 'lucide-react';
import { useSilentMode } from '@/hooks/useSilentMode';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const RED   = '#ef4444';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

function GpsBeacon({ active }) {
  const [ping, setPing] = useState(0);
  useEffect(() => {
    if (!active) { setPing(0); return; }
    const t = setInterval(() => setPing(p => p + 1), 5000);
    return () => clearInterval(t);
  }, [active]);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', width: 80, height: 80 }}>
        {active && [0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `2px solid ${RED}`,
            animation: `sosPing 2s ease-out ${i * 0.6}s infinite`,
            opacity: 0,
          }} />
        ))}
        <div style={{
          position: 'relative', width: 80, height: 80, borderRadius: '50%',
          background: active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${active ? RED : BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.4s',
        }}>
          <MapPin style={{ width: 28, height: 28, color: active ? RED : 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>
      {active && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: RED, fontWeight: 700, letterSpacing: '0.06em', animation: 'pulse 1s ease infinite' }}>
          GPS TRANSMITTING · PING #{ping + 1}
        </p>
      )}
    </div>
  );
}

export default function SilentModeDemo() {
  const [motionGranted, setMotionGranted] = useState(null); // null | true | false
  const [log, setLog] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const logRef = useRef(null);

  const addLog = (msg) => setLog(prev => [...prev.slice(-6), { msg, ts: new Date().toLocaleTimeString() }]);

  const { active, strikes, activate, cancel } = useSilentMode({
    onActivate: () => {
      addLog('⚠️ SILENT MODE ACTIVATED — GPS transmitting every 5 seconds');
      addLog('🔇 Screen darkened — attacker sees nothing unusual');
      addLog('📡 Safety Circle alerted silently');
      addLog('🚔 Security team notified — location locked');
      setCountdown(null);
    },
    onCancel: () => {
      addLog('✅ Silent mode cancelled by owner');
    },
  });

  // Request motion permission on iOS
  const requestMotion = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        setMotionGranted(result === 'granted');
      } catch { setMotionGranted(false); }
    } else {
      setMotionGranted(true); // Android / desktop — no permission needed
    }
  };

  // Show strike feedback
  useEffect(() => {
    if (strikes > 0 && strikes < 3) addLog(`📳 Shake ${strikes}/3 detected`);
  }, [strikes]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  // Active screen — dark, minimal, hostile to attacker
  if (active) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`
          @keyframes sosPing { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
          @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        `}</style>

        {/* Silent SOS screen — attacker sees a blank/sleeping screen */}
        <GpsBeacon active />

        <div style={{ marginTop: 32, textAlign: 'center', padding: '0 32px' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>
            MORALES SILENT MODE
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 11, color: 'rgba(255,255,255,0.1)', lineHeight: 1.7 }}>
            GPS transmitting · Safety Circle alerted · Security dispatched
          </p>
        </div>

        {/* Activity log — tiny, unobtrusive */}
        <div ref={logRef} style={{ width: '100%', maxWidth: 340, maxHeight: 130, overflowY: 'auto', padding: '0 20px' }}>
          {log.map((l, i) => (
            <p key={i} style={{ margin: '2px 0', fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>
              [{l.ts}] {l.msg}
            </p>
          ))}
        </div>

        {/* Cancel — owner only knows this exists */}
        <button
          onClick={cancel}
          style={{
            marginTop: 40, padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 600,
          }}
        >
          Cancel Silent Mode (owner only)
        </button>

        <p style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.08)', textAlign: 'center', padding: '0 32px', lineHeight: 1.6 }}>
          Attacker sees a dark screen · M is working silently behind it
        </p>
      </div>
    );
  }

  // Standby screen
  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <style>{`
        @keyframes sosPing { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 26, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Silent Mode</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: RED, fontWeight: 800, letterSpacing: '0.06em' }}>DANGER FEATURE</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 24px' }}>

        {/* Scenario */}
        <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 32 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: RED, letterSpacing: '0.1em' }}>SCENARIO</p>
          <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.7 }}>
            James is being followed in Tijuana. He can't speak. He can't look at his phone. Someone is watching every move.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: GOLD, fontWeight: 700 }}>
            He shakes his phone 3 times. That's all.
          </p>
        </div>

        {/* Strike counter */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              width: 52, height: 52, borderRadius: '50%',
              background: strikes >= n ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${strikes >= n ? RED : BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, transition: 'all 0.2s',
              animation: strikes >= n ? 'shake 0.3s ease' : 'none',
            }}>
              {strikes >= n ? '📳' : <span style={{ color: BORDER, fontWeight: 800, fontSize: 14 }}>{n}</span>}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', margin: '0 0 32px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          {strikes === 0 ? 'Shake your phone 3 times quickly' : strikes === 1 ? '2 more shakes...' : strikes === 2 ? '1 more shake...' : 'Activating...'}
        </p>

        {/* Motion permission */}
        {motionGranted === null && (
          <button
            onClick={requestMotion}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer', marginBottom: 16,
              background: `linear-gradient(135deg, ${GOLD}, #E8C85C)`,
              border: 'none', color: DARK, fontSize: 14, fontWeight: 800,
            }}
          >
            Enable Shake Detection
          </button>
        )}
        {motionGranted === false && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>Motion access denied. Use the manual button below to demo.</p>
          </div>
        )}

        {/* Manual trigger for desktop/denied */}
        <button
          onClick={activate}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 14, cursor: 'pointer', marginBottom: 24,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
            color: RED, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <ShieldOff style={{ width: 15, height: 15 }} /> Simulate 3 Shakes (desktop demo)
        </button>

        {/* GPS beacon preview */}
        <GpsBeacon active={false} />

        {/* Log */}
        {log.length > 0 && (
          <div ref={logRef} style={{ marginTop: 24, padding: '14px 16px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, maxHeight: 160, overflowY: 'auto' }}>
            {log.map((l, i) => (
              <p key={i} style={{ margin: '3px 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                [{l.ts}] {l.msg}
              </p>
            ))}
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.08em' }}>HOW M SILENT MODE WORKS</p>
          {[
            ['📳 3 shakes detected', 'Accelerometer fires in under 1.5 seconds'],
            ['🔇 Screen goes dark', 'Attacker sees nothing — looks like sleep mode'],
            ['📡 GPS locks and transmits', 'Location sent every 5 seconds silently'],
            ['🚨 Safety Circle alerted', 'Maria, Marcus, security firm — all notified'],
            ['🔒 Only owner can cancel', 'Face ID, fingerprint, or secret tap pattern'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{title.split(' ')[0]}</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#fff' }}>{title.slice(2)}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
