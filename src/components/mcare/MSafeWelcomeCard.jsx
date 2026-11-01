import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Heart, MapPin } from 'lucide-react';
import { GOLD, NIGHT, GLASS } from './panelPalette';

/**
 * MSafeWelcomeCard — the first thing M-Safe "says" on the phone screen, styled
 * after Portia's north-star mockup (glass card, gold edge, sub-cards).
 *
 * Everything in it is real: the headline and opening line come from
 * src/lib/msafeWelcome.js, `alert` is a high or critical update M-Care really
 * sent (with its real time), and `places` are the hotel and clinic saved on the
 * traveler's case. A visitor with no trip gets the headline and opening line
 * only, never an invented alert or "saved places".
 */

/** @param {string} tint @returns {React.CSSProperties} */
const subCardStyle = (tint) => ({
  display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left',
  background: tint, border: `1px solid ${GLASS.hairline}`, borderRadius: 18, padding: '12px 14px',
});

export default function MSafeWelcomeCard({ title, body, timeLabel = '', alert = null, hasTrip = false, places = [], onOpenPlaces = null }) {
  return (
    <section
      aria-label="Welcome from M-Care"
      style={{
        background: GLASS.cardStrong, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur,
        border: `1px solid ${GLASS.edge}`, borderRadius: 26, boxShadow: GLASS.shadow,
        padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span aria-hidden="true" style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 35% 30%, #1B2740, #070C18)', border: `1.5px solid ${GOLD}`,
          boxShadow: '0 0 12px rgba(212,175,55,0.35)',
        }}>
          <img src="/morales-m-mark.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 22 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: NIGHT.ink }}>M-Care</span>
            {timeLabel && <span style={{ fontSize: 13, color: NIGHT.muted }}>• {timeLabel}</span>}
            <span style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${GLASS.hairline}`, borderRadius: 999,
              padding: '3px 10px', fontSize: 12, color: NIGHT.ink,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: NIGHT.positive }} /> Just now
            </span>
          </div>
          <h2 style={{ margin: '6px 0 0', fontSize: 21, lineHeight: 1.25, fontWeight: 800, color: NIGHT.ink, letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: 'rgba(243,245,247,0.9)' }}>{body}</p>
        </div>
      </div>

      {hasTrip && (alert ? (
        <div role="status" style={subCardStyle('rgba(242,181,68,0.08)')}>
          <AlertTriangle aria-hidden="true" style={{ flexShrink: 0, width: 26, height: 26, color: NIGHT.warn, marginTop: 1 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NIGHT.warn }}>Latest alert</p>
            <p style={{ margin: '3px 0 0', fontSize: 14, lineHeight: 1.45, color: NIGHT.ink, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {alert.text}
            </p>
            {alert.ago && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: NIGHT.muted }}>{alert.ago}</p>}
          </div>
        </div>
      ) : (
        <div style={subCardStyle('rgba(74,222,128,0.06)')}>
          <CheckCircle2 aria-hidden="true" style={{ flexShrink: 0, width: 26, height: 26, color: NIGHT.positive, marginTop: 1 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NIGHT.positive }}>No alerts right now</p>
            <p style={{ margin: '3px 0 0', fontSize: 14, lineHeight: 1.45, color: NIGHT.muted }}>I check on your trip every 15 minutes.</p>
          </div>
        </div>
      ))}

      {hasTrip && places.length > 0 && (
        <button
          type="button"
          onClick={onOpenPlaces || undefined}
          disabled={!onOpenPlaces}
          className="ms-press ms-row"
          style={{ ...subCardStyle('rgba(255,255,255,0.03)'), alignItems: 'center', cursor: onOpenPlaces ? 'pointer' : 'default' }}
        >
          <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(74,222,128,0.16)' }}>
            <MapPin style={{ width: 15, height: 15, color: NIGHT.positive }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: NIGHT.positive }}>Your saved places</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: NIGHT.ink }}>{places.join(' • ')}</span>
          </span>
          {onOpenPlaces && <ChevronRight aria-hidden="true" style={{ width: 20, height: 20, color: NIGHT.muted, flexShrink: 0 }} />}
        </button>
      )}

      {hasTrip && (
        <p style={{ margin: '2px 2px 0', fontSize: 14.5, lineHeight: 1.45, color: 'rgba(243,245,247,0.85)' }}>
          I'll keep an eye on your trip and let you know if anything changes.{' '}
          <Heart aria-hidden="true" style={{ display: 'inline', width: 16, height: 16, color: GOLD, verticalAlign: '-3px' }} />
        </p>
      )}
    </section>
  );
}
