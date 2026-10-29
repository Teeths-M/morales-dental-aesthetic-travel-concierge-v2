/**
 * BotAvatar — the M-care mark, 32px.
 *
 * White body, gold linework, a thin gold ring. Small enough to sit beside every
 * message without competing with it, which is the point: the bot is visibly
 * present for the whole sequence rather than being named in a label.
 */
export default function BotAvatar({ className = '' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      className={`mp-avatar ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="15.25" fill="#ffffff" stroke="#C9A227" strokeWidth="1.5" />
      <circle cx="16" cy="7.4" r="1.3" fill="#C9A227" />
      <path d="M16 8.7V10.8" stroke="#C9A227" strokeWidth="1.2" strokeLinecap="round" />
      <rect
        x="9.6"
        y="10.8"
        width="12.8"
        height="9.6"
        rx="3"
        fill="#ffffff"
        stroke="#C9A227"
        strokeWidth="1.4"
      />
      <circle cx="13.4" cy="15.6" r="1.15" fill="#C9A227" />
      <circle cx="18.6" cy="15.6" r="1.15" fill="#C9A227" />
    </svg>
  );
}