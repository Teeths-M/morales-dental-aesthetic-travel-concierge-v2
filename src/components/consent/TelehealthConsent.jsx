import React from 'react';
import ConsentCheckboxCard from './ConsentCheckboxCard';

export const TELEHEALTH_CONSENT_VERSION = '1.0';

export default function TelehealthConsent({ checked, onChange }) {
  return (
    <ConsentCheckboxCard
      title="Telehealth consent"
      description="I understand this is a video consultation, not an in-person exam, and that my doctor's ability to assess me is limited to what's possible over video."
      checked={checked}
      onChange={onChange}
      dataTestId="telehealth-consent"
    />
  );
}
