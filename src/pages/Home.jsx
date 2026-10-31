import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import McareTranscript from '@/components/landing/McareTranscript';
import PilotSection from '@/components/landing/PilotSection';
import LandingFooter from '@/components/landing/LandingFooter';
import McareGreeting from '@/components/landing/McareGreeting';
import { NAVY, MUTED } from '@/components/landing/theme';

/**
 * Home — the cinematic landing page.
 *
 * Three sections and one greeting, in this order: the question, the evidence,
 * the invitation. The previous composition (hero, stats bar, how-it-works,
 * experts, why-M-Care, protection stack, moments, sticky CTA) was removed from
 * THIS page only — every one of those components still exists and the routes
 * that use them still work, so restoring any of them is a one-line change.
 */
export default function Home() {
  return (
    <div style={{ background: NAVY }}>
      <LandingNav />

      <LandingHero />

      <McareTranscript />

      <PilotSection />

      {/* Legal disclaimer — preserved verbatim from the previous landing page.
          It is a factual statement about the business, not marketing copy, so it
          stays on the page in full. */}
      <div
        style={{
          background: NAVY,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '20px 24px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            color: MUTED,
            lineHeight: 1.7,
            maxWidth: 720,
            margin: '0 auto',
            letterSpacing: '0.02em',
          }}
        >
          M-Care is a medical travel coordination service, not a medical provider. We do not provide
          medical advice, diagnosis, or treatment. All clinical decisions are made solely by licensed
          medical professionals. Savings estimates are based on average published US procedure list
          prices and vary by provider, location, and individual case. M-Care does not guarantee
          clinical outcomes.
        </p>
      </div>

      <LandingFooter />

      {/* M-Care greets once per session and asks for an email — nothing more. */}
      <McareGreeting />
    </div>
  );
}