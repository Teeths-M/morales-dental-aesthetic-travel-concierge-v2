/**
 * mcareIntroCopy — every editable string McareIntro.jsx renders, kept in one
 * file per the original request so wording can be tuned without touching
 * animation/timing logic. Every phone-mockup exchange below is grounded in a
 * real, shipped M-Care capability (doctor trust-tier verification, Care Room
 * live translation, JourneyPlan trip building, on-demand ride dispatch) —
 * never an invented or absolute claim ("guaranteed," "verified everywhere").
 */

export const HOOK_LINE = 'Healthcare should not stop at a border.';

// 7 islands x a 4-capability cycle (spec gave 4 captions for 7 stops) — each
// stop pairs a real flag + country name with a short, grounded mock exchange
// referencing a real M-Care capability, never a fabricated one.
export const ISLAND_STOPS = [
  {
    flag: '🇯🇲',
    country: 'Jamaica',
    caption: 'Verifying a doctor',
    userLine: 'Is Dr. Alvarez verified?',
    replyLine: 'License and identity confirmed.',
  },
  {
    flag: '🇧🇧',
    country: 'Barbados',
    caption: 'Translating a consultation',
    userLine: '¿Puede explicar la recuperación?',
    replyLine: 'Translating in real time...',
  },
  {
    flag: '🇹🇹',
    country: 'Trinidad and Tobago',
    caption: 'Organizing a journey',
    userLine: 'Plan my trip to Port of Spain.',
    replyLine: 'Building your journey plan.',
  },
  {
    flag: '🇩🇴',
    country: 'Dominican Republic',
    caption: 'Securing a safe transfer',
    userLine: 'I need a ride from the airport.',
    replyLine: 'Dispatching a trusted driver.',
  },
  {
    flag: '🇧🇸',
    country: 'The Bahamas',
    caption: 'Verifying a doctor',
    userLine: 'Check this clinic for me.',
    replyLine: 'Credentials and license on file.',
  },
  {
    flag: '🇱🇨',
    country: 'Saint Lucia',
    caption: 'Translating a consultation',
    userLine: 'Can we talk in French Creole?',
    replyLine: 'Interpreting live for your call.',
  },
  {
    flag: '🇬🇾',
    country: 'Guyana',
    caption: 'Organizing a journey',
    userLine: 'What comes after I land?',
    replyLine: 'Here is your full itinerary.',
  },
];

export const MOTION_LINES = ['Analyze.', 'Protect.', 'Coordinate.', 'Resolve.'];

export const FINAL_LINES = ['One conversation.', 'One protected journey.'];

export const BRAND_LINE = 'M-CARE';
export const BRAND_SUBLINE = 'AI Medical Travel Concierge';

export const SKIP_LABEL = 'Skip intro';
export const REPLAY_LABEL = 'Replay';
