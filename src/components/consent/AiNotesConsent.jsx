import React from 'react';
import ConsentCheckboxCard from './ConsentCheckboxCard';

export const AI_NOTES_CONSENT_VERSION = '1.0';

export default function AiNotesConsent({ checked, onChange }) {
  return (
    <ConsentCheckboxCard
      title="AI note-taking (optional)"
      description="M-Care may produce a private summary of this call for your own review, only if you agree. This is off by default and only I can see it — it is never shared without my separate say-so."
      checked={checked}
      onChange={onChange}
      dataTestId="ai-notes-consent"
    />
  );
}
