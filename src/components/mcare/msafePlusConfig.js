/**
 * msafePlusConfig — single source of truth for the M-Safe+ luxury workspace.
 * Palette, branding, capability data, chat styling, and the sample preview
 * conversation all live here so the presentational components stay clean.
 */

export const MSAFE_PALETTE = {
  ivory: '#F8F7F3',
  charcoal: '#1D1D1C',
  charcoalSoft: '#333333',
  goldDeep: '#C9A43B',
  goldMid: '#D8B85A',
  goldLight: '#F1DE9B',
  goldPlus: '#D4AF37',
  // Nudged 2026-08-29 to the exact "LIVE SESSION" mint from the desktop
  // "M-Safe+" light redesign reference (#27B86C) — zero other consumers of
  // these three values exist besides LiveSessionBadge.jsx, confirmed via
  // grep, so this is a contained value change, not a shared-risk edit.
  mintBg: 'rgba(39, 184, 108, 0.14)',
  mintDot: '#27B86C',
  mintText: '#166A3E',
};

export const MSAFE_BRAND = {
  title: 'M-Safe',
  plus: '+',
  subtitle: 'Morales Super Agent · Medical + Travel Concierge',
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

// Shown as a styled preview when no real conversation exists yet, so the
// workspace matches the reference on first load. Replaced by real messages
// the moment the user sends a message or taps a capability pill.
export const SAMPLE_CONVERSATION = [
  { role: 'user', content: "I need medical support arranged for travel to Geneva next week. Can you help?", time: '09:11' },
  { role: 'assistant', content: "Of course — I'd be glad to help coordinate your medical care in Geneva. To get started, could you share:\n• Your travel dates (arrival & departure)\n• The type of medical support you need (consultation, procedure, physiotherapy)\n• Any language or accessibility preferences\n• Whether you already have a provider or need me to find one", time: '09:12' },
  { role: 'user', content: "Arriving Oct 14th, departing Oct 21st. Need an English-speaking doctor, possible physiotherapy for a knee issue.", time: '09:12' },
  { role: 'assistant', content: "Got it — I've identified 3 top English-speaking clinics near Geneva offering physiotherapy. I can book a consultation for Oct 15 or 16. Would you like me to coordinate travel, a nearby hotel, and your insurance documents?", time: '09:13' },
];