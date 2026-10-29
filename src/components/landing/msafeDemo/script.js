/**
 * The three situations the landing-page demo actually plays, one after another.
 *
 * Each step is a moment in the session: a message from M-Care ('text'), a tool
 * the agent actually runs ('verb'), or a provider check result ('doctor').
 * `completes` marks which task pill the step finishes. Delays are the pause
 * BEFORE that step appears, so the whole thing paces like a session rather
 * than a slideshow.
 */
export const SCENARIOS = [
  {
    id: 'provider',
    label: 'Provider check',
    scene: 'Real scenario · Provider verification',
    pills: ['discoverProviderCandidates', 'verifyDiscoveredCandidate'],
    steps: [
      {
        kind: 'text',
        delay: 500,
        text: 'Morning. I checked both surgeons against the registers they are licensed with — not against anything they told us about themselves.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'discoverProviderCandidates · 2 candidates returned',
        completes: 0,
      },
      {
        kind: 'doctor',
        delay: 1500,
        name: 'Dr. Elena Ruiz Castellón',
        badge: 'Verified',
        tone: 'green',
        note: 'Secretaría de Salud (SEP), Mexico · Checked today',
      },
      { kind: 'text', delay: 1300, text: 'The second one is a different story.' },
      {
        kind: 'verb',
        delay: 1400,
        text: 'verifyDiscoveredCandidate · SEP registry queried',
        completes: 1,
      },
      {
        kind: 'doctor',
        delay: 1500,
        name: 'Dr. Marco Fuentes Leal',
        badge: 'Could Not Be Verified Here',
        tone: 'grey',
        note: 'No electronic registry available for this credential yet — flagged for care-team review, not marked failed.',
      },
      {
        kind: 'text',
        delay: 1600,
        text: 'So to be precise about what that badge means: a primary source confirmed the credential today. It is a statement about evidence, not a score, and not a promise about the surgery. Where I cannot reach a register, I say so rather than quietly marking the surgeon failed.',
        note: 'Pilot note: licence verification covers the electronic registries reachable today — not every country publishes one.',
      },
    ],
  },
  {
    id: 'checkin',
    label: 'Missed check-in',
    scene: 'Real scenario · Missed check-in',
    pills: ['acknowledgeSoloCheckIn', 'escalateSoloCheckIn'],
    steps: [
      {
        kind: 'text',
        delay: 600,
        text: 'You missed your 14:00 check-in. I am not going to assume the worst yet — but I am going to start looking.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'acknowledgeSoloCheckIn · window expired 22 minutes ago',
        completes: 0,
      },
      {
        kind: 'text',
        delay: 1600,
        text: 'Last known position is the hotel lobby at 13:41, on the hotel wifi. I have messaged your sister as a courtesy, not as an alarm.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'escalateSoloCheckIn · guardian notified · 90-second window running',
        completes: 1,
      },
      {
        kind: 'text',
        delay: 1600,
        text: 'If you tap check-in in the next 90 seconds this stops here. If you do not, I call the front desk myself.',
        note: 'Pilot note: escalation to emergency services is never automatic — a human care-team member places that call.',
      },
    ],
  },
  {
    id: 'flight',
    label: 'Flight disruption',
    scene: 'Real scenario · Flight disruption',
    pills: ['pollActiveTripFlights', 'mcareAutonomousFlightReroute'],
    steps: [
      {
        kind: 'text',
        delay: 600,
        text: 'Your 07:40 connection out of Panama is cancelled. The surgeon\'s window is Thursday morning, and I do not intend to lose it.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'pollActiveTripFlights · 3 alternatives returned',
        completes: 0,
      },
      {
        kind: 'text',
        delay: 1700,
        text: 'Two seats are held on the 11:15 to San José, and the clinic has been told to expect you an hour later. Neither is booked — I will not spend your money without you.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'mcareAutonomousFlightReroute · clinic and driver rescheduled',
        completes: 1,
      },
      {
        kind: 'text',
        delay: 1500,
        text: 'Say the word and I book the 11:15.',
        note: 'Pilot note: rebooking always waits for your approval — nothing is purchased on your behalf.',
      },
    ],
  },
];