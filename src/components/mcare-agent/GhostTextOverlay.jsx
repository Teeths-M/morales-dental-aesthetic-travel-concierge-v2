// GhostTextOverlay — the visual half of inline "ghost text" auto-fill.
// Renders an absolutely-positioned, non-interactive layer stacked over
// the real chat input: an invisible copy of what's already been typed
// (so it occupies the exact same width) followed by the gray suggested
// continuation, plus a small "Tab" hint. pointer-events: none is
// load-bearing — without it this overlay would silently swallow clicks
// meant for the real input underneath it.
export default function GhostTextOverlay({ typedText, suggestion, matchStyle = {}, matchClassName = '' }) {
  if (!suggestion) return null;

  return (
    <div
      aria-hidden="true"
      className={matchClassName}
      style={{
        ...matchStyle,
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        background: 'transparent',
        border: '1px solid transparent',
        boxShadow: 'none',
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      <span style={{ visibility: 'hidden' }}>{typedText}</span>
      <span style={{ color: '#9CA3AF' }}>{suggestion}</span>
      <kbd
        style={{
          marginLeft: 6,
          flexShrink: 0,
          fontSize: 10,
          fontFamily: 'inherit',
          padding: '1px 5px',
          borderRadius: 4,
          background: '#E5E7EB',
          color: '#6B7280',
        }}
      >
        Tab
      </kbd>
    </div>
  );
}
