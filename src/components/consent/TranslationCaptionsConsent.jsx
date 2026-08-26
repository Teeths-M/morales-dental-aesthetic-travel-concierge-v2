import React from 'react';
import ConsentCheckboxCard from './ConsentCheckboxCard';

export const TRANSLATION_CAPTIONS_CONSENT_VERSION = '1.0';

export default function TranslationCaptionsConsent({ checked, onChange }) {
  return (
    <ConsentCheckboxCard
      title="Machine-translated captions"
      description="I understand any translated captions during this call are machine-translated and may contain errors — and that for consent, diagnosis, treatment, or risk discussion, a qualified human interpreter is recommended, not a substitute I should rely on."
      checked={checked}
      onChange={onChange}
      dataTestId="translation-captions-consent"
    />
  );
}
