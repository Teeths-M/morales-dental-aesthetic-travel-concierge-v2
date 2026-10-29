/**
 * BotAvatar — M-care's own bot, at 32px.
 *
 * This is the real M-care render (`public/robot-avatar.png`, the same glossy
 * white shell, black visor and amber eyes used everywhere in the product),
 * not a redrawn stand-in — the walkthrough is showing this product, so the
 * face in it has to be the face people actually meet in the app.
 *
 * It sits in a white circle with a thin gold ring: the brand accent, and the
 * only thing that marks who is speaking now that the bubbles carry no labels.
 */
export default function BotAvatar({ className = '' }) {
  return (
    <span className={`mp-avatar ${className}`} aria-hidden="true">
      <img src="/robot-avatar.png" alt="" width="32" height="32" />
    </span>
  );
}