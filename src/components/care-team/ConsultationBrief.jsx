import React from 'react';

const BUDGET_OPTIONS = [
  { value: 'under_5k', label: 'Under $5,000' },
  { value: '5k_10k', label: '$5,000 – $10,000' },
  { value: '10k_20k', label: '$10,000 – $20,000' },
  { value: '20k_plus', label: '$20,000+' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const SHAREABLE_FIELD_LABELS = {
  medical_conditions: 'Medical conditions',
  allergies: 'Allergies',
  medication_types: 'Current medications',
  emotional_concern_types: 'Emotional/psychological concerns',
  pregnancy_status: 'Pregnancy status',
};

/** @type {React.CSSProperties} */
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #2A3F4A', borderRadius: 10,
  padding: '10px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 6 };

/**
 * ConsultationBrief — the spec's ConsultationBrief module. Collects goals,
 * budget range, questions for the doctor, accessibility/companion needs,
 * and lets the patient explicitly select which of their own already-
 * disclosed fields may be shared with this specific doctor for this
 * specific booking (brief_shared_fields — an explicit allowlist, never
 * "everything").
 */
export default function ConsultationBrief({ brief, onChange, availableSharedFields = [] }) {
  const b = brief || {};
  const set = (field, value) => onChange({ ...b, [field]: value });

  const toggleShared = (field) => {
    const current = b.shared_fields || [];
    const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
    set('shared_fields', next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>What would you like to discuss?</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={b.goals || ''}
          onChange={(e) => set('goals', e.target.value)}
          placeholder="e.g. Whether dental implants are right for me, and what recovery looks like."
        />
      </div>

      <div>
        <label style={labelStyle}>Budget range (optional)</label>
        <select style={inputStyle} value={b.budget_range || ''} onChange={(e) => set('budget_range', e.target.value)}>
          <option value="">Select a range…</option>
          {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Questions for your doctor</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={b.questions_for_doctor || ''}
          onChange={(e) => set('questions_for_doctor', e.target.value)}
          placeholder="Anything specific you want answered on the call."
        />
      </div>

      <div>
        <label style={labelStyle}>Accessibility or companion needs</label>
        <input
          style={inputStyle}
          value={b.accessibility_companion_needs || ''}
          onChange={(e) => set('accessibility_companion_needs', e.target.value)}
          placeholder="Optional — anything that would help this consultation go smoothly."
        />
      </div>

      {availableSharedFields.length > 0 && (
        <div>
          <label style={labelStyle}>What may we share with this doctor for this consultation?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableSharedFields.map((field) => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(b.shared_fields || []).includes(field)}
                  onChange={() => toggleShared(field)}
                  style={{ width: 16, height: 16, accentColor: '#D4AF37' }}
                />
                {SHAREABLE_FIELD_LABELS[field] || field}
              </label>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Nothing is shared unless you explicitly check it.
          </p>
        </div>
      )}
    </div>
  );
}
