/** Palette and shared styles for the landing-page M-Safe demonstration. */
export const C = {
  ground: '#F5F2ED',
  sidebar: '#F8F5F0',
  card: '#FFFFFF',
  border: '#E4DCCB',
  gold: '#C5A059',
  goldInk: '#B08A3E',
  ink: '#2D2A26',
  soft: '#6B6560',
  faint: '#8C8C87',
  greenBg: '#D1E7DD',
  greenInk: '#0F5132',
  greenBorder: '#B7D9C6',
  greyBg: '#ECE9E2',
  greyInk: '#55504A',
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
};

export const BUBBLE = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '13px 15px',
  boxShadow: '0 1px 2px rgba(45,42,38,0.05), 0 6px 16px rgba(45,42,38,0.04)',
  color: C.ink,
  fontSize: 13,
  lineHeight: 1.62,
  margin: 0,
};

/** 24-hour clock time for a revealed moment — the demo's own real timestamps. */
export function clockTime(date) {
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}