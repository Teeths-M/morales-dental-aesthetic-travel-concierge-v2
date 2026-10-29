import { GOLD } from './theme';

/**
 * McareMark — M-Care's presence. The real M-Care mark inside a soft gold ring,
 * sized by the caller. Deliberately faceless: it is an instrument, not a
 * character, and it should never wink at anyone.
 */
export default function McareMark({ size = 36, glow = true }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${GOLD}66`,
        background: 'rgba(212,175,55,0.08)',
        boxShadow: glow ? `0 0 ${Math.round(size / 2)}px rgba(212,175,55,0.22)` : 'none',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src="/morales-m-mark.png"
        alt=""
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </span>
  );
}