// Pure decision logic behind useGhostTextSuggestion.js — kept separate so
// it's cheaply unit-testable without a DOM/network-coupled hook. Mirrors
// the same thresholds SmartInputSuggestions.jsx's own (now-removed) predict
// effect used, so the gating behavior an M-Care user already experienced
// via the old prediction chips carries over unchanged to the new inline
// ghost-text UI.
const MIN_LEN = 3;
const MAX_LEN = 140;

export function shouldQueryGhostSuggestion({ text, caretAtEnd, disabled }) {
  if (disabled || !caretAtEnd) return false;
  const trimmed = (text || '').trim();
  if (trimmed.length < MIN_LEN) return false;
  // A trailing .!? or an already-long message reads as a finished
  // thought — predicting a continuation would rarely be useful.
  if (/[.!?]$/.test(trimmed) || trimmed.length > MAX_LEN) return false;
  return true;
}

// Appends the suggestion after exactly one space, never doubling up if
// the current text already ends in whitespace, and never leading with a
// stray space if the input is empty.
export function buildAcceptedText(currentText, suggestion) {
  if (!suggestion) return currentText;
  const current = currentText || '';
  const needsSpace = current.length > 0 && !/\s$/.test(current);
  return current + (needsSpace ? ' ' : '') + suggestion;
}
