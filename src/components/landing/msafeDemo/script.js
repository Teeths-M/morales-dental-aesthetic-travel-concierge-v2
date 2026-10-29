/**
 * The three situations the landing-page demo actually plays, one after another.
 *
 * Each step is a moment in the session: a message from M-Care ('text'), a tool
 * the agent actually runs ('verb'), a provider check result ('doctor'), or a
 * decision it states out loud ('decision').
 *
 * The decision steps are the point. Anyone can claim to be careful; the demo
 * shows the fork in the road and which way the agent went, with the rule that
 * decided it. `completes` marks which task pill the step finishes; delays are
 * the pause BEFORE that step appears, so the whole thing paces like a session
 * rather than a slideshow.
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
        kind: 'decision',
        delay: 1500,
        title: 'Elena is verified. Marco is not verified — and not failed.',
        rule: 'A badge is only issued from a primary source. Where I cannot reach one, I say so and hand it to a human rather than quietly deciding.',
      },
      {
        kind: 'text',
        delay: 1500,
        text: 'That is the whole rule: verified is a statement about evidence, not a score, and never a promise about the surgery.',
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
        kind: 'decision',
        delay: 1500,
        title: 'Guardian paged. Emergency services not called.',
        rule: 'A missed window is a signal, not an emergency. Something has to be genuinely wrong before a siren is raised, and a person makes that call.',
      },
      {
        kind: 'text',
        delay: 1500,
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
        text: 'Two seats are held on the 11:15 to San José, and the clinic has been told to expect you an hour later.',
      },
      {
        kind: 'verb',
        delay: 1500,
        text: 'mcareAutonomousFlightReroute · clinic and driver rescheduled',
        completes: 1,
      },
      {
        kind: 'decision',
        delay: 1500,
        title: 'Rebooking prepared. Purchase withheld.',
        rule: 'Your approval is the last step of every purchase, however urgent the morning is. I hold seats; I do not spend your money.',
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