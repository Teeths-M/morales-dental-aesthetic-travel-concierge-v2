import React from 'react';
import TelehealthConsent from '@/components/consent/TelehealthConsent';
import AiNotesConsent from '@/components/consent/AiNotesConsent';
import TranslationCaptionsConsent from '@/components/consent/TranslationCaptionsConsent';
import RecordingConsent from '@/components/consent/RecordingConsent';

/**
 * ConsentManager — the spec's ConsentManager module. Composes the 4 typed
 * consents (telehealth is required to proceed; the other 3 are optional).
 * Controlled component — the parent owns state and persists it via
 * recordVirtualConsultationConsent, one real request per consent type.
 */
export default function ConsentManager({ consents, onChange }) {
  const c = consents || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TelehealthConsent checked={c.telehealth} onChange={(v) => onChange('telehealth', v)} />
      <AiNotesConsent checked={c.ai_notes} onChange={(v) => onChange('ai_notes', v)} />
      <TranslationCaptionsConsent checked={c.translation_captions} onChange={(v) => onChange('translation_captions', v)} />
      <RecordingConsent checked={c.recording} onChange={(v) => onChange('recording', v)} />
      {!c.telehealth && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>
          Telehealth consent is required to proceed. The other three are optional.
        </p>
      )}
    </div>
  );
}
