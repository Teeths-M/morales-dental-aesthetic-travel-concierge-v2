import React from 'react';
import LuxuryHero from '../components/home/LuxuryHero';
import LuxuryStatsBar from '../components/home/LuxuryStatsBar';
import LuxuryHowItWorks from '../components/home/LuxuryHowItWorks';
import LuxuryWhyMorales from '../components/home/LuxuryWhyMorales';
import RealMoments from '../components/home/RealMoments';
import OurExpertsTeaser from '../components/home/OurExpertsTeaser';
import LuxuryTestimonials from '../components/home/LuxuryTestimonials';
import ProtectionStackSection from '../components/home/ProtectionStackSection';
import StickyBookCTA from '../components/home/StickyBookCTA';

export default function Home() {
  return (
    <div style={{ background: '#060B16' }}>
      <LuxuryHero />
      <LuxuryStatsBar />
      <LuxuryHowItWorks />
      <OurExpertsTeaser />
      <LuxuryWhyMorales />
      <ProtectionStackSection />
      <RealMoments />
      <LuxuryTestimonials />
      <StickyBookCTA />

      {/* Medical disclaimer */}
      <div style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7, maxWidth: 720, margin: '0 auto', letterSpacing: '0.02em' }}>
          Morales is a medical travel coordination service, not a medical provider. We do not provide medical advice, diagnosis, or treatment.
          All clinical decisions are made solely by licensed medical professionals. Savings estimates are based on average published US procedure list prices and vary by provider, location, and individual case.
          Morales does not guarantee clinical outcomes.
        </p>
      </div>
    </div>
  );
}
