import React from 'react';
import { CONSOLE } from './consoleTheme';

/**
 * EvidenceBlock — a verification finding inside an agent message: what was
 * checked, and what the answer honestly was. The yellow rule is the whole
 * point; it marks a statement about evidence, never a decoration.
 */
export default function EvidenceBlock({ title, body }) {
  return (
    <div style={{ borderLeft: `3px solid ${CONSOLE.yellow}`, paddingLeft: 12, marginTop: 14 }}>
      <p style={{ color: CONSOLE.yellow, fontWeight: 700, fontSize: 13, margin: 0 }}>{title}</p>
      <p style={{ color: CONSOLE.textSoft, fontSize: 13.5, lineHeight: 1.6, margin: '5px 0 0' }}>{body}</p>
    </div>
  );
}