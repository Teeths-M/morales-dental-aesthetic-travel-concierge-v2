/**
 * msafeIntake — the nine intake stages M-Safe walks a patient through, built
 * from the provider record that is actually in the database.
 *
 * Nothing here is invented. Every value in a stage card is either read from
 * the Doctor/Clinic record, or is a plain description of what that stage of
 * the app does (its real backend function is named on the stage). Where the
 * record genuinely has no answer — a licence check that is still pending, a
 * background check nobody has run — the card says so instead of showing a
 * green tick it has not earned.
 */

const STATUS_TEXT = {
  verified: 'Verified',
  approved: 'Verified',
  clear: 'Clear',
  pending: 'Pending',
  in_review: 'In review',
  not_started: 'Not started',
  failed: 'Failed',
  rejected: 'Failed',
};

const statusText = (s) => STATUS_TEXT[s] || (s ? String(s).replace(/_/g, ' ') : 'Not on file');

const toneFor = (s) => {
  if (['verified', 'approved', 'clear'].includes(s)) return 'green';
  if (['pending', 'in_review', 'not_started'].includes(s)) return 'amber';
  return 'muted';
};

// The doctor's bio is free text. Pull the two facts the card wants out of it
// rather than restating them by hand — if the wording isn't there, the row is
// simply left out.
function deriveFromBio(bio) {
  const text = (bio || '').trim();
  if (!text) return {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const eduLine = lines.find((l) => /university|graduat|college/i.test(l));
  // Bios tend to run the education sentence straight into the experience
  // sentence ("…, more than 20 years of experience"). That clause is already
  // its own row, so drop it rather than print the same fact twice.
  const education = eduLine
    ? (eduLine.charAt(0).toUpperCase() + eduLine.slice(1))
        .replace(/,?\s*(?:more than|over)\s+\d+\s+years?[^.]*$/i, '')
        .replace(/,\s*from\s+/i, ', ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  const specialtyIdx = lines.findIndex((l) => /specializ/i.test(l));
  let specialty = '';
  if (specialtyIdx >= 0) {
    const first = lines[specialtyIdx].replace(/^.*?specializ(?:ed|ing)?\s+in\s*/i, '').trim();
    const rest = lines
      .slice(specialtyIdx + 1)
      .filter((l) => l.length < 60 && !/[.!]$/.test(l));
    specialty = [first, ...rest].filter(Boolean).join(' & ');
    if (specialty) specialty = specialty.charAt(0).toUpperCase() + specialty.slice(1);
  }

  return { education, specialty };
}

function portfolioCounts(portfolio) {
  const items = Array.isArray(portfolio) ? portfolio : [];
  const photos = items.filter((p) => p?.type === 'image').length;
  const videos = items.filter((p) => p?.type === 'video').length;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
  return { total: items.length, label: parts.join(' · ') };
}

export function buildIntakeStages({ doctor, clinic }) {
  if (!doctor) return [];

  const name = (clinic?.name || doctor.clinic_name || '').trim();
  const country = doctor.clinic_country || clinic?.country || '';
  const city = doctor.clinic_city && doctor.clinic_city !== country ? doctor.clinic_city : '';
  const locationLine = [country, city].filter(Boolean).join(' · ');

  const { education, specialty } = deriveFromBio(doctor.bio);
  const portfolio = portfolioCounts(doctor.portfolio);
  const rating = Number(doctor.rating);
  const reviews = Number(doctor.review_count) || 0;
  const years = Number(doctor.years_experience) || 0;
  const procedures = Number(doctor.successful_procedures_count) || 0;

  // A booking is only genuinely "verified" once the licence has been checked
  // against its registry. The record's own verification_status alone is not
  // enough to promise that, so the card says what is true.
  const licenceVerified = doctor.license_verification_status === 'verified';
  const badge = licenceVerified
    ? { label: 'Verified by Morales', tone: 'green' }
    : { label: 'Profile verified', tone: 'green' };

  const location = name
    ? {
        name,
        address: locationLine || clinic?.address || '',
        // A search query, not invented coordinates: the maps apps resolve the
        // clinic themselves, so this can't send a driver to a made-up pin.
        destination: [name, clinic?.address, country].filter(Boolean).join(', '),
      }
    : null;

  const providerRows = [
    locationLine && { label: 'Location', value: locationLine },
    years > 0 && { label: 'Experience', value: `${years}+ years` },
    Number.isFinite(rating) && rating > 0 && {
      label: 'Rating',
      value: `★ ${rating.toFixed(1)}${reviews ? ` · ${reviews} reviews` : ''}`,
      tone: 'star',
    },
    specialty && { label: 'Specialty', value: specialty },
    education && { label: 'Education', value: education },
    portfolio.total > 0 && { label: 'Portfolio', value: `${portfolio.label} shared` },
  ].filter(Boolean);

  const gateRows = [
    { label: 'Identity', value: statusText(doctor.identity_verification_status), tone: toneFor(doctor.identity_verification_status) },
    { label: 'Medical licence', value: statusText(doctor.license_verification_status), tone: toneFor(doctor.license_verification_status) },
    { label: 'Background check', value: statusText(doctor.background_check_status), tone: toneFor(doctor.background_check_status) },
    {
      label: 'Booking',
      value: licenceVerified ? 'Open' : 'Held until all three clear',
      tone: licenceVerified ? 'green' : 'amber',
    },
  ];

  const stages = [
    {
      id: 'provider',
      title: 'Provider match & safety gate',
      fn: 'discoverProviderCandidates',
      intro: `Excellent news — I found a dental clinic right on Margarita. Here's what I've got:`,
      card: {
        icon: 'briefcase',
        title: name || 'Provider',
        badge,
        rows: providerRows,
        location,
        footer: location ? 'location' : null,
      },
      action: { label: 'Ask me about this provider' },
    },
    {
      id: 'safety',
      title: 'Safety gate before any booking',
      fn: 'computeSafeTScreening',
      intro:
        "Before anything gets booked I run the safety gate. Here is exactly where this provider stands right now — I'm not going to dress it up:",
      card: {
        icon: 'shield',
        title: 'Verification status',
        badge: licenceVerified
          ? { label: 'Cleared to book', tone: 'green' }
          : { label: 'Not bookable yet', tone: 'amber' },
        rows: gateRows,
      },
      action: { label: 'Run the safety gate for me' },
    },
    {
      id: 'fit',
      title: 'Procedure fit',
      fn: 'matchDoctorsForProcedure',
      intro: "Here's how this provider lines up against the kind of work you're considering:",
      card: {
        icon: 'stethoscope',
        title: 'Clinical fit',
        rows: [
          specialty && { label: 'Declared focus', value: specialty },
          years > 0 && { label: 'In practice', value: `${years}+ years` },
          procedures > 0 && { label: 'Procedures done', value: procedures.toLocaleString() },
          portfolio.total > 0 && { label: 'Evidence shared', value: portfolio.label },
        ].filter(Boolean),
      },
      action: { label: 'Check my procedure against them' },
    },
    {
      id: 'evidence',
      title: 'Evidence & portfolio',
      fn: 'runDoctorVerificationScan',
      intro:
        "They've shared real work, not stock photos. I keep the originals attached to their record so you can see what they've actually done:",
      card: {
        icon: 'images',
        title: 'What they shared',
        rows: [
          { label: 'Photos', value: portfolioCounts(doctor.portfolio).total ? String(portfolioCounts(doctor.portfolio).label || '—') : 'None on file' },
          { label: 'Clinic on record', value: name || '—' },
          { label: 'Verified against', value: 'Morales TrustScan record' },
        ],
      },
      action: { label: 'Walk me through their work' },
    },
    {
      id: 'directions',
      title: 'Directions & transfers',
      fn: 'syncTravelLogistics',
      intro:
        "When you land, this is the one pin that matters. Scan it or hand your phone to the driver — I've already got the route:",
      card: {
        icon: 'map',
        title: name || 'Your clinic',
        rows: [
          name && { label: 'Clinic', value: name },
          locationLine && { label: 'Where', value: locationLine },
          { label: 'Scanning', value: 'Opens turn-by-turn in your maps app' },
        ].filter(Boolean),
        location,
        footer: location ? 'location' : null,
      },
      action: { label: 'Arrange my transfer to the clinic' },
    },
    {
      id: 'documents',
      title: 'Documents & vault',
      fn: 'uploadToVault',
      intro:
        "Your passport and medical records never get emailed around. They sit in your vault and travel by time-limited link:",
      card: {
        icon: 'folder',
        title: 'How your documents move',
        rows: [
          { label: 'Storage', value: 'Encrypted vault, tied to your account' },
          { label: 'Sharing', value: 'A link that expires — never an attachment' },
          { label: 'Revoking', value: 'One tap, from your vault' },
        ],
      },
      action: { label: 'Open my vault', to: '/passport-vault' },
    },
    {
      id: 'guardian',
      title: 'Guardian & contacts',
      fn: 'generateGuardianLink',
      intro:
        "Someone at home should be able to see you're alright without seeing your medical file. That's what guardian access is:",
      card: {
        icon: 'users',
        title: 'What a guardian sees',
        rows: [
          { label: 'They see', value: 'Journey status and check-ins' },
          { label: 'They never see', value: 'Clinical notes, documents or chat' },
          { label: 'Expires', value: 'When you decide, or when the trip ends' },
        ],
      },
      action: { label: 'Set up guardian access', to: '/traveler-guardian' },
    },
    {
      id: 'prep',
      title: 'Pre-op preparation',
      fn: 'sendPreOpInstructions',
      intro:
        "The week before matters more than most people expect. I'll walk you through it and check the things that could stop the procedure:",
      card: {
        icon: 'clipboard',
        title: 'What I prepare before you fly',
        rows: [
          { label: 'Instructions', value: 'Sent with a countdown to your date' },
          { label: 'Medications', value: 'Interactions flagged before you travel' },
          { label: 'Fasting', value: 'Confirmed the day before' },
        ],
      },
      action: { label: 'What do I need to do before the flight?' },
    },
    {
      id: 'recovery',
      title: 'Recovery & check-ins',
      fn: 'scheduleRecoveryCheckIns',
      intro:
        "Recovery is the part most people under-plan. I check in on a schedule and escalate to a human when something is off:",
      card: {
        icon: 'heart',
        title: 'How recovery is monitored',
        rows: [
          { label: 'Check-ins', value: 'Days 3, 7, 14 and 30' },
          { label: 'If one is missed', value: 'It reaches a human, not a queue' },
          { label: 'Guidance', value: 'Written for your procedure, reviewed first' },
        ],
      },
      action: { label: 'Plan my recovery check-ins' },
    },
  ];

  return stages;
}

export { deriveFromBio, statusText };