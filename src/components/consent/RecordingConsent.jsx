import React from 'react';
import ConsentCheckboxCard from './ConsentCheckboxCard';

export const RECORDING_CONSENT_VERSION = '1.0';

/**
 * RecordingConsent — MUST default unchecked and stay visually separated from
 * the other 3 consents (per VirtualConsultation.jsonc's own recording_consent
 * field description: "MUST default false... never bundled into a general
 * consent checkbox"). Uses the 'danger' variant precisely so it never blends
 * visually with the other three, ordinary consents.
 */
export default function RecordingConsent({ checked, onChange }) {
  return (
    <ConsentCheckboxCard
      title="Recording (off by default)"
      description="This call is NOT recorded unless you explicitly agree here. Recording stays off unless you check this box."
      checked={checked}
      onChange={onChange}
      variant="danger"
      dataTestId="recording-consent"
    />
  );
}
