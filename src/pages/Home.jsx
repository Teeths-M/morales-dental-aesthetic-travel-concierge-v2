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
      <OurExpertsTeaser />
      <LuxuryHowItWorks />
      <LuxuryWhyMorales />
      <ProtectionStackSection />
      <RealMoments />
      <LuxuryTestimonials />
      <StickyBookCTA />
    </div>
  );
}
