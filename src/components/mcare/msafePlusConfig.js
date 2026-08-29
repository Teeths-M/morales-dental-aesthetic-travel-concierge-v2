/**
 * msafePlusConfig — single source of truth for the M-Safe+ luxury landing
 * screen. All text, palette, and capability data live here so the hero
 * components stay presentational and easy to tune.
 */

export const MSAFE_PALETTE = {
  ivory: '#F8F7F3',
  charcoal: '#1D1D1C',
  charcoalSoft: '#333333',
  goldDeep: '#C9A43B',
  goldMid: '#D8B85A',
  goldLight: '#F1DE9B',
  goldPlus: '#D4AF37',
  mintBg: 'rgba(214, 238, 226, 0.75)',
  mintDot: '#3FB47F',
  mintText: '#1F6B4F',
};

export const MSAFE_BRAND = {
  title: 'M-Safe',
  plus: '+',
  subtitle: 'Morales Super Agent · Medical + Travel Concierge',
};

// Each capability seeds the M-Safe conversation with an opening intent the
// agent can act on immediately.
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
    icon: 'Share2',
    intent: "Help me coordinate my medical travel — flights, accommodation, transfers, and the logistics around my procedure.",
  },
  {
    id: 'resolve',
    label: 'Resolve',
    icon: 'CircleCheck',
    intent: "I need to resolve something on my care journey. Help me weigh my options and take the right next step with confidence.",
  },
];