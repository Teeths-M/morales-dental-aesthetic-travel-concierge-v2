/**
 * The demonstration transcript.
 *
 * Every scenario carries a `kind` and a `footnote`, and the footnote is not
 * decoration — it is the honesty layer. `kind: 'illustrative'` means the
 * capability exists in the product but the transcript is a demonstration, so
 * nothing in it happened to a real person. `kind: 'live'` means the behaviour
 * described is literally how the shipped app works.
 *
 * The rule that shapes every line of copy: M-Care never claims to have done
 * something it cannot confirm. It says "queued", not "sent". It says "the
 * licence is not confirmed", not "verified". Those refusals are the product.
 */

export const MCARE = 'mcare';
export const YOU = 'you';
export const OUTCOME = 'outcome';

export const CLOSING =
  'One agent. The same one, from the first record to the last check-in.';

export const SCENARIOS = [
  {
    id: 'verification',
    label: 'Provider verification',
    day: 'Day 1 · the shortlist',
    kind: 'illustrative',
    footnote:
      'Provider records and licence lookups are real parts of Morales — publicDoctorCheck and verifyDoctorLicense run against partner records and primary registries. This transcript is a demonstration: no registry was queried and no clinic was contacted.',
    messages: [
      {
        from: MCARE,
        at: '09:12',
        text: "Before anything is booked, I check who I'm handing you to. Give me a moment with the records I hold for the clinic in Port of Spain.",
      },
      {
        from: OUTCOME,
        at: '09:13',
        tone: 'caution',
        title: 'Listed — not verified',
        text: 'I found the clinic in our directory, and the office answers on the number we hold.',
      },
      {
        from: OUTCOME,
        at: '09:13',
        tone: 'caution',
        title: 'Licence: no primary-source confirmation',
        text: "I could not confirm the surgeon's licence against the medical register. Without that, I will not call them verified. Verified is a statement about evidence, and I do not have the evidence.",
      },
      {
        from: MCARE,
        at: '09:14',
        text: 'You can still choose them. What you cannot have from me is a badge I have not earned the right to give.',
      },
    ],
  },
  {
    id: 'coordination',
    label: 'Journey coordination',
    day: 'Day 4 · appointment day',
    kind: 'illustrative',
    footnote:
      'Re-timing and logistics sync exist in the product — syncTravelLogistics, recalculateTripTimings and assignChauffeurServices. This is a demonstration: no booking was changed and no driver was messaged.',
    messages: [
      {
        from: MCARE,
        at: '06:40',
        text: 'The hospital has moved your appointment from 09:00 to 13:30.',
      },
      {
        from: MCARE,
        at: '06:40',
        text: 'Checking what that breaks. Your transfer is booked for 08:15. Your companion meets you at the ward at 08:45.',
      },
      {
        from: OUTCOME,
        at: '06:41',
        tone: 'caution',
        title: 'Timing conflict — transport',
        text: 'The transfer now delivers you four hours before anyone needs you there, and leaves the driver waiting.',
      },
      {
        from: MCARE,
        at: '06:41',
        text: "I have asked the driver to re-time it. That request is out. It is not a confirmed change until they answer.",
      },
      {
        from: MCARE,
        at: '06:42',
        text: 'I would rather tell you it is pending than tell you it is handled.',
      },
    ],
  },
  {
    id: 'handshake',
    label: 'A missed check-in',
    day: 'Day 4 · 08:47',
    kind: 'illustrative',
    footnote:
      'The missed-handshake escalation and its fallback chain are real — escalateMissedDriverHandshake and the driver backup search. This is a demonstration: no driver, call or page was actually made.',
    messages: [
      {
        from: MCARE,
        at: '08:47',
        text: 'Your driver has not completed the handshake. The window closed twelve minutes ago.',
      },
      {
        from: MCARE,
        at: '08:48',
        text: 'Working the approved fallback list in order — two numbers. The first did not answer.',
      },
      {
        from: OUTCOME,
        at: '08:49',
        tone: 'critical',
        title: 'No approved alternative left',
        text: 'I have escalated to a person on the Morales team, with your location and the time the window closed.',
      },
      {
        from: MCARE,
        at: '08:49',
        text: 'I will not promise you a car at a time I cannot verify. A person will call you.',
      },
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    day: 'Day 6 · recovery',
    kind: 'illustrative',
    footnote:
      'Recovery check-ins run for real — submitRecoveryCheckin and interpretRecoveryCheckIn — and any written guidance reaches a patient only after human approval (reviewRecoveryGuidance). This is a demonstration: no clinician was paged.',
    messages: [
      {
        from: MCARE,
        at: '10:02',
        text: 'Day three. Two questions, then I will leave you alone. How is the pain compared with yesterday?',
      },
      { from: YOU, at: '10:09', text: 'Worse. And the wound feels warm.' },
      {
        from: OUTCOME,
        at: '10:09',
        tone: 'caution',
        title: 'Passed to a clinician — not assessed by me',
        text: 'Warmth at the site is something a person needs to look at. I have recorded your words with the time and put them in front of the clinical team on your case.',
      },
      {
        from: MCARE,
        at: '10:10',
        text: 'I do not diagnose and I do not prescribe. What I do is make sure the thing you said does not get lost in a chat log.',
      },
    ],
  },
  {
    id: 'offline',
    label: 'Lost connectivity',
    day: 'Day 7 · the airport',
    kind: 'live',
    footnote:
      'This one is real behaviour, not a mock. The offline queue, the cached vault and the separate queued / sent / delivered states all ship today, which is why a message written in a basement is never shown as delivered.',
    messages: [
      {
        from: MCARE,
        at: '17:20',
        text: 'You are offline. I can still open your emergency card and the documents I cached on this device.',
      },
      {
        from: OUTCOME,
        at: '17:21',
        tone: 'neutral',
        title: 'Your message is queued',
        text: 'It is saved on this phone, not sent. It leaves when you have signal, stamped with the time you wrote it.',
      },
      {
        from: MCARE,
        at: '17:21',
        text: 'When something is received, I show it as received. When it is only queued, I say queued. I will not dress one up as the other.',
      },
    ],
  },
];

export const KIND_LABEL = {
  live: 'Live behaviour',
  illustrative: 'Illustrated — nothing sent',
};