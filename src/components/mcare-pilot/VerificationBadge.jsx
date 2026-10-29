/**
 * VerificationBadge — the licence check, shown as a specimen of the format.
 *
 * The badge itself says only what state it is in. Underneath it, the three facts
 * that make the claim checkable: who issued the licence, in which country, and
 * when a human last looked. A badge without those three lines would be a
 * decoration.
 */
export default function VerificationBadge() {
  return (
    <div>
      <div className="mp-badge">
        <span className="mp-badge-mark" aria-hidden="true">✓</span>
        <span>Licence verified</span>
      </div>

      <dl className="mt-8 space-y-1.5">
        <div className="mp-meta">General Medical Council</div>
        <div className="mp-meta">United Kingdom</div>
        <div className="mp-meta">Checked 14 October 2026</div>
      </dl>
    </div>
  );
}