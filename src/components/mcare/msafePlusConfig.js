/**
 * msafePlusConfig — single source of truth for the M-Safe+ workspace.
 * Palette, branding, capability data and chat styling live here so the
 * presentational components stay clean.
 */

// The light "M-Safe+" workspace surface (the desktop reference). These are
// exposed to the components as CSS custom properties on the workspace root,
// so the moon control switches the entire surface by swapping values once
// rather than threading a theme object through every component.
export const MSAFE_THEME_VARS = {
  light: {
    '--ms-sidebar': '#FBF7EE',
    '--ms-main': '#FFFFFF',
    '--ms-card': '#FFFFFF',
    '--ms-raised': '#FBFAF6',
    '--ms-border': '#EAE3D5',
    '--ms-border-soft': '#F2EDE2',
    '--ms-ink': '#333333',
    '--ms-ink-soft': '#666666',
    '--ms-ink-faint': '#8C8C87',
    '--ms-green': '#3CB371',
    '--ms-green-bg': 'rgba(60, 179, 113, 0.12)',
    '--ms-green-ink': '#1F7A4D',
    '--ms-amber-bg': 'rgba(218, 165, 32, 0.14)',
    '--ms-amber-ink': '#8A6512',
    '--ms-gold': '#DAA520',
    '--ms-chip': '#F6F1E4',
  },
  dark: {
    '--ms-sidebar': '#12100C',
    '--ms-main': '#0B0B0A',
    '--ms-card': '#151410',
    '--ms-raised': '#1A1814',
    '--ms-border': '#2A2620',
    '--ms-border-soft': '#221F1A',
    '--ms-ink': '#F2EFE6',
    '--ms-ink-soft': '#B9B3A4',
    '--ms-ink-faint': '#8B8579',
    '--ms-green': '#3CB371',
    '--ms-green-bg': 'rgba(60, 179, 113, 0.16)',
    '--ms-green-ink': '#6FD79C',
    '--ms-amber-bg': 'rgba(218, 165, 32, 0.18)',
    '--ms-amber-ink': '#E0BE6A',
    '--ms-gold': '#D9B44A',
    '--ms-chip': '#1E1B16',
  },
};

export const MSAFE_PALETTE = {
  ivory: '#F8F7F3',
  charcoal: '#1D1D1C',
  charcoalSoft: '#333333',
  goldDeep: '#C9A43B',
  goldMid: '#D8B85A',
  goldLight: '#F1DE9B',
  goldPlus: '#D4AF37',
  mintBg: 'rgba(39, 184, 108, 0.14)',
  mintDot: '#27B86C',
  mintText: '#166A3E',
};

export const MSAFE_BRAND = {
  title: 'M-Safe',
  plus: '+',
  name: 'M-Care Super Agent',
  subtitle: 'Medical + Travel Concierge',
};

export const MSAFE_CHAT = {
  panelBg: '#FBFAF6',
  userAccent: 'linear-gradient(135deg, #F6E6BE 0%, #EAD08C 100%)',
  userAccentText: '#1D1D1C',
  agentBubble: '#FFFFFF',
  border: 'rgba(210,169,61,0.2)',
};

// Each capability seeds the M-Safe conversation with an opening intent.
export const CAPABILITIES = [
  {
    id: 'analyze',
    label: 'Analyze',
    icon: 'Search',
    intent: "I'd like to analyze my medical options. Help me understand a procedure I'm considering, the risks, and what to look for in a safe, qualified provider.",
  },
  {
    id: 'protect',
    label: 'Protect',
    icon: 'Shield',
    intent: "I want to be protected on this journey. Run a Safe-T safety screening and help me verify my provider is legitimate before anything is booked.",
  },
  {
    id: 'coordinate',
    label: 'Coordinate',
    icon: 'LayoutGrid',
    intent: "Help me coordinate my medical travel — flights, accommodation, transfers, and the logistics around my procedure.",
  },
  {
    id: 'resolve',
    label: 'Resolve',
    icon: 'Check',
    intent: "I need to resolve something on my care journey. Help me weigh my options and take the right next step with confidence.",
  },
];