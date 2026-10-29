/**
 * consoleTheme — the dark "demonstration console" palette for the M-Care chat.
 * One place for the colours so every console component agrees with the
 * reference: deep charcoal ground, slate bubbles, a single yellow that marks
 * evidence, and nothing else.
 */
export const CONSOLE = {
  page: '#0b0e14',
  bubble: '#1a1f26',
  bubbleBorder: '#242a33',
  card: '#141922',
  border: '#333842',
  borderSoft: '#1c212b',
  text: '#e0e0e0',
  textSoft: '#a0a0a0',
  textFaint: '#6b7280',
  yellow: '#ffcc33',
  gold: '#D4AF37',
  userBubble: '#232936',
};

// The composer is shared with the light workspace and reads var(--ms-*), so the
// console supplies its own values for those same properties.
export const CONSOLE_VARS = {
  '--ms-main': CONSOLE.page,
  '--ms-card': CONSOLE.card,
  '--ms-border': CONSOLE.border,
  '--ms-border-soft': CONSOLE.borderSoft,
  '--ms-chip': CONSOLE.bubble,
  '--ms-ink': CONSOLE.text,
  '--ms-ink-soft': CONSOLE.textSoft,
  '--ms-ink-faint': CONSOLE.textFaint,
  '--ms-gold': CONSOLE.yellow,
  '--ms-green': '#3CB371',
  '--ms-green-bg': 'rgba(60, 179, 113, 0.14)',
  '--ms-green-ink': '#6FD79C',
  '--ms-amber-bg': 'rgba(255, 204, 51, 0.12)',
  '--ms-amber-ink': CONSOLE.yellow,
};