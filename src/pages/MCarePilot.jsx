import '@/pages/mcare-pilot.css';
import HeroCorridor from '@/components/mcare-pilot/HeroCorridor';
import Walkthrough from '@/components/mcare-pilot/Walkthrough';
import VerificationBadge from '@/components/mcare-pilot/VerificationBadge';
import PilotForm from '@/components/mcare-pilot/PilotForm';

/**
 * M-care pilot — the whole public site, one page.
 *
 * Rendered outside AppLayout on purpose: no navigation, no footer, no product
 * chrome. The page is a corridor, four statements, one badge and a form.
 *
 * Every word here is deliberate and there is very little of it. The rules the
 * copy keeps: no statistics, no testimonials, no logos, no stock doctors, no
 * claims the product cannot evidence.
 */

const CONTAINER = 'mx-auto w-full max-w-[1180px] px-6 md:px-14 lg:px-20';

const BEATS = [
  {
    label: 'Before.',
    text: 'We verify who is operating on you. Licence and facility checked against the regulator in that country, with the authority, the country and the date printed on the badge.',
  },
  {
    label: 'During.',
    text: 'One person holds the flights, the stay, the driver and the companion, so you are not the one chasing four strangers in a language you do not speak.',
  },
  {
    label: 'After.',
    text: 'When a check-in is missed, we call. When the call goes unanswered, people move.',
  },
];

export default function MCarePilot() {
  return (
    <div className="mp-root">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mp-hero">
        <HeroCorridor />

        <div className="relative z-10 flex h-full flex-col justify-end">
          <div className={`${CONTAINER} pb-16 md:pb-24`}>
            <h1 className="max-w-[22ch]">
              If something happened to you abroad tonight, who would know?
            </h1>

            <p className="mp-shout mt-5 md:mt-6">
              Someone would.
            </p>

            <p className="mp-lede mt-8 md:mt-10">
              M-care verifies the doctor, holds the trip together, and stays on the call after the money has moved.
            </p>

            <a href="#pilot" className="mp-cta mt-9 md:mt-11">
              Join the pilot
            </a>
          </div>
        </div>
      </section>

      {/* ── Three beats ──────────────────────────────────────────────────── */}
      <section className={CONTAINER}>
        <div className="space-y-24 py-24 md:space-y-40 md:py-40">
          {BEATS.map((beat) => (
            <div key={beat.label} className="grid gap-4 md:grid-cols-[190px_1fr] md:gap-16">
              <h2>{beat.label}</h2>
              <p className="mp-beat-text">{beat.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Walkthrough ──────────────────────────────────────────────────── */}
      <section className={`${CONTAINER} border-t border-[rgba(245,243,239,0.12)] py-24 md:py-36`}>
        <Walkthrough />
      </section>

      {/* ── Verification ─────────────────────────────────────────────────── */}
      <section className={`${CONTAINER} border-t border-[rgba(245,243,239,0.12)] py-24 md:py-36`}>
        <VerificationBadge />

        <p className="mp-body mt-14">
          Where we cannot confirm a provider, the badge says so plainly. Could not be verified
          is not the same as failed, and we never show it as one.
        </p>
      </section>

      {/* ── What M-care is not ───────────────────────────────────────────── */}
      <section className={`${CONTAINER} border-t border-[rgba(245,243,239,0.12)] py-20 md:py-28`}>
        <ul className="mp-fine space-y-1">
          <li>M-care is not a clinic.</li>
          <li>M-care is not insurance.</li>
          <li>M-care is not medical advice.</li>
          <li>M-care does not replace your doctor.</li>
        </ul>
      </section>

      {/* ── The ask ──────────────────────────────────────────────────────── */}
      <section
        id="pilot"
        className={`${CONTAINER} scroll-mt-16 border-t border-[rgba(245,243,239,0.12)] py-24 md:py-36`}
      >
        <PilotForm />
      </section>
    </div>
  );
}