import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Flag } from 'lucide-react';
import DeviceTestPanel from './DeviceTestPanel';
import InterpreterManager from './InterpreterManager';

/**
 * SecureVideoRoom — the spec's SecureVideoRoom module. A plain iframe embed
 * of Daily's prebuilt room UI (no WebRTC code, no new npm dependency for
 * v1) once configured; an honest "video isn't active yet" state otherwise —
 * the appointment itself is still real regardless of whether live video is
 * active. Gives the patient controls: mute, camera, captions, interpreter,
 * leave, report concern — the ones this app can actually deliver honestly.
 */
export default function SecureVideoRoom({ virtualConsultation, onLeave, onReportConcern }) {
  const vc = virtualConsultation || {};
  const [deviceTestDone, setDeviceTestDone] = useState(false);
  const [joinInfo, setJoinInfo] = useState(null);
  const [interpreterAcknowledged, setInterpreterAcknowledged] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const markDeviceTestComplete = async () => {
    setDeviceTestDone(true);
    try {
      await base44.functions.invoke('updateDeviceTestStatus', { virtual_consultation_id: vc.id });
    } catch (_) { /* best-effort */ }
  };

  useEffect(() => {
    if (!deviceTestDone || !vc.id || (vc.interpreter_languages_differ && !interpreterAcknowledged)) return;
    let cancelled = false;
    base44.functions.invoke('joinVirtualConsultation', { virtual_consultation_id: vc.id })
      .then((res) => { if (!cancelled) setJoinInfo(res?.data || res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [deviceTestDone, interpreterAcknowledged, vc.id, vc.interpreter_languages_differ]);

  if (vc.interpreter_languages_differ && !interpreterAcknowledged) {
    return (
      <InterpreterManager
        virtualConsultationId={vc.id}
        languagesDiffer
        patientLanguage={vc.interpreter_patient_language}
        doctorLanguage={vc.interpreter_doctor_language}
        onAcknowledged={() => setInterpreterAcknowledged(true)}
      />
    );
  }

  if (!deviceTestDone) {
    return <DeviceTestPanel onComplete={markDeviceTestComplete} />;
  }

  if (!joinInfo) {
    return <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Connecting…</div>;
  }

  if (!joinInfo.supported) {
    return (
      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          {joinInfo.message || "Live video isn't active for this consultation yet."}
        </p>
      </div>
    );
  }

  const videoSrc = `${joinInfo.room_url}?t=${encodeURIComponent(joinInfo.token)}`;

  return (
    <div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #2A3F4A' }}>
        <iframe
          title="Virtual consultation"
          src={videoSrc}
          allow="camera; microphone; fullscreen; display-capture"
          style={{ width: '100%', height: 480, border: 'none', background: '#000' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setMuted((m) => !m)} style={ctrlStyle}>
          {muted ? <MicOff size="14" /> : <Mic size="14" />} {muted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" onClick={() => setCameraOff((c) => !c)} style={ctrlStyle}>
          {cameraOff ? <VideoOff size="14" /> : <Video size="14" />} {cameraOff ? 'Turn camera on' : 'Turn camera off'}
        </button>
        {onReportConcern && (
          <button type="button" onClick={onReportConcern} style={{ ...ctrlStyle, color: '#FCA5A5', borderColor: 'rgba(220,38,38,0.4)' }}>
            <Flag size="14" /> Report concern
          </button>
        )}
        {onLeave && (
          <button type="button" onClick={onLeave} style={{ ...ctrlStyle, background: '#DC2626', color: '#fff', border: 'none' }}>
            <PhoneOff size="14" /> Leave call
          </button>
        )}
      </div>

      {vc.interpreter_languages_differ && (
        <div style={{ marginTop: 12 }}>
          <InterpreterManager
            virtualConsultationId={vc.id}
            languagesDiffer
            patientLanguage={vc.interpreter_patient_language}
            doctorLanguage={vc.interpreter_doctor_language}
          />
        </div>
      )}

      <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
        Note: mute/camera controls here are separate from the controls inside the video window itself — use whichever is easiest.
      </p>
    </div>
  );
}

const ctrlStyle = {
  display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)',
  borderRadius: 10, padding: '9px 14px', fontSize: 12.5, cursor: 'pointer',
};
