import React from 'react';
import { WITHDRAWAL_WAIVER_TEXT, requiresWithdrawalWaiver } from '@/lib/withdrawalWaiver';

/**
 * The EU/UK cancellation-right box (src/lib/withdrawalWaiver.js). Unticked by
 * default, a box of its own, and shown only on checkouts the policy lists.
 *
 * @param {{
 *   flow?: string,
 *   checked?: boolean,
 *   onChange?: (checked: boolean) => void,
 *   id?: string,
 *   tone?: 'light' | 'dark'
 * }} props
 */
export default function WithdrawalWaiverConsent({
  flow = '',
  checked = false,
  onChange = () => {},
  id = 'withdrawal-waiver',
  tone = 'light',
}) {
  if (!requiresWithdrawalWaiver(flow)) return null;
  const dark = tone === 'dark';
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
        padding: '12px 14px', borderRadius: 12, textAlign: 'left',
        background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
        border: `1px solid ${dark ? '#2A3F4A' : '#E2E8F0'}`,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: '#0E8A7D' }}
      />
      <span style={{ fontSize: 12.5, lineHeight: 1.55, color: dark ? 'rgba(255,255,255,0.75)' : '#334155' }}>
        {WITHDRAWAL_WAIVER_TEXT}
      </span>
    </label>
  );
}
