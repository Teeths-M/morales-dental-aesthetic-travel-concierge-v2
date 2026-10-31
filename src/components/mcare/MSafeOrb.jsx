import React from 'react';
import LivingOrb from './LivingOrb';

/**
 * MSafeOrb — the one M-Safe identity, with its state vocabulary made explicit.
 *
 * The drawing is LivingOrb (unchanged: the real robot render, ring halo, blink,
 * parallax, reduced-motion fallback). This wrapper adds the two things the orb
 * was missing:
 *
 * 1. A state vocabulary that can be reasoned about — listening, thinking,
 *    speaking, monitoring, warning, offline — instead of eight animation keys.
 * 2. Accessibility and honesty. The orb is a picture carrying information, so it
 *    is labelled for a screen reader ("M-Safe — Listening"). And the two states
 *    that assert something about the world are GATED: `monitoring` renders only
 *    when the caller confirms the monitoring service is really active, and
 *    `warning` only when a genuine safety event is behind it. Without that
 *    confirmation the orb falls back to idle rather than implying a watch that
 *    is not happening.
 *
 * Nothing here starts, schedules or simulates anything — every state is passed
 * in from a real signal, and reduced motion is handled inside LivingOrb.
 */

const STATES = {
  idle:           { living: 'idle',           label: 'Ready' },
  listening:      { living: 'listening',      label: 'Listening' },
  thinking:       { living: 'thinking',       label: 'Thinking' },
  speaking:       { living: 'speaking',       label: 'Speaking' },
  tool_executing: { living: 'tool_executing', label: 'Coordinating' },
  offline:        { living: 'offline',        label: 'Offline — saved information only' },
  // Gated states — see the doc comment above.
  monitoring:     { living: 'acting',         label: 'Monitoring in the background', requires: 'monitoringConfirmed' },
  acting:         { living: 'acting',         label: 'Monitoring in the background', requires: 'monitoringConfirmed' },
  warning:        { living: 'alert',          label: 'Safety warning', requires: 'warningConfirmed' },
  alert:          { living: 'alert',          label: 'Safety warning', requires: 'warningConfirmed' },
};

export default function MSafeOrb({
  state = 'idle',
  size = 44,
  monitoringConfirmed = false,
  warningConfirmed = false,
  label,
  className,
  ...rest
}) {
  const requested = STATES[state] ? state : 'idle';
  const entry = STATES[requested];
  const confirmed = { monitoringConfirmed, warningConfirmed };
  const allowed = !entry.requires || confirmed[entry.requires] === true;
  const active = allowed ? requested : 'idle';
  const config = STATES[active];

  return (
    <span
      role="img"
      aria-label={`M-Safe — ${label || config.label}`}
      data-orb-state={active}
      className={className}
      style={{ display: 'inline-flex', flexShrink: 0 }}
    >
      <LivingOrb state={config.living} size={size} {...rest} />
    </span>
  );
}