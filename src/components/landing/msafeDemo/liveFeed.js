/**
 * The ongoing monitoring feed for the landing-page demonstration.
 *
 * The three scenarios prove how M-Care decides. This is the other half of the
 * promise: what a journey actually feels like hour after hour — vitals, a
 * medication that falls due, a driver moving, weather turning, a guardian
 * asking. They are stamped with the visitor's real clock as they arrive, so the
 * session reads as running now rather than as a recording.
 *
 * Illustrative copy only. Nothing here calls a function or touches a record.
 */
export const LIVE_FEED = [
  {
    kind: 'medical',
    label: 'Vitals',
    text: 'Temperature 36.8 °C, wound site clean. No action needed.',
  },
  {
    kind: 'travel',
    label: 'Travel',
    text: 'Driver moved to 18:40 — hotel lobby, same car, same driver.',
  },
  {
    kind: 'care',
    label: 'Medication',
    text: 'Antibiotic due in 20 minutes. I will confirm it was actually taken.',
  },
  {
    kind: 'weather',
    label: 'Weather',
    text: 'Heavy rain from 16:00. Your review moved to the indoor consulting room.',
  },
  {
    kind: 'medical',
    label: 'Recovery',
    text: 'Swelling down 2 mm since yesterday. Still on the expected curve.',
  },
  {
    kind: 'travel',
    label: 'Clinic',
    text: '09:15 review confirmed with the same surgeon. Nothing for you to do.',
  },
  {
    kind: 'care',
    label: 'Guardian',
    text: 'Your sister asked for an update. Recovery summary sent, with your consent.',
  },
  {
    kind: 'medical',
    label: 'Vitals',
    text: 'Pain 3/10, down from 5/10. Pain relief not needed yet.',
  },
  {
    kind: 'travel',
    label: 'Documents',
    text: 'Passport and discharge notes checked into the vault before departure.',
  },
  {
    kind: 'travel',
    label: 'Flight',
    text: 'Flight home still on schedule. I will keep watching it until you land.',
  },
];

/** Chip colours per update kind — calm, never alarming. */
export const KIND_STYLE = {
  medical: { bg: '#D1E7DD', ink: '#0F5132' },
  travel: { bg: '#F1E7D3', ink: '#8C6B2F' },
  care: { bg: '#ECE9E2', ink: '#55504A' },
  weather: { bg: '#E6EDF2', ink: '#3E5B6E' },
};