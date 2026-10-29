/**
 * demoTranscript — what the console shows before a real session has begun: a
 * single worked day, so the screen demonstrates how M-Care reports evidence
 * rather than sitting empty. It is replaced the moment the patient sends
 * anything, and nothing here is ever written to a conversation.
 */
export const DEMO_DAY_LABEL = 'Day 1 · The shortlist';

export const DEMO_TRANSCRIPT = [
  {
    id: 'demo-1',
    time: '09:12',
    text: "Morning. I went back through the shortlist for Margarita overnight. Two of the three clinics are straightforward. The third is the one with the best photographs — and the one I can't stand behind yet.",
  },
  {
    id: 'demo-2',
    time: '09:12',
    text: '',
    blocks: [
      {
        title: 'Listed — not verified',
        body: 'I found the clinic in our directory, and the office answers on the number we hold.',
      },
    ],
  },
  {
    id: 'demo-3',
    time: '09:14',
    text: 'So here is exactly where it stands with the one you asked me about.',
    blocks: [
      {
        title: 'Licence: no primary-source confirmation',
        body: "I could not confirm the surgeon's licence against the medical register. Without that, I will not call them verified. Verified is a statement about evidence, and I do not have the evidence.",
      },
    ],
  },
  {
    id: 'demo-4',
    time: '09:14',
    text: 'Two ways forward: I can request the licence from the clinic directly — that usually takes a day — or we move on to one of the two I can already vouch for. Which would you prefer?',
  },
];