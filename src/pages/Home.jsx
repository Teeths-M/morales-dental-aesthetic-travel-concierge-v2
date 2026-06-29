import React from 'react';
import LuxuryHero from '../components/home/LuxuryHero';
import LuxuryTrustBar from '../components/home/LuxuryTrustBar';
import LuxuryStatsBar from '../components/home/LuxuryStatsBar';
import LuxuryHowItWorks from '../components/home/LuxuryHowItWorks';
import LuxuryWhyMorales from '../components/home/LuxuryWhyMorales';
import RealMoments from '../components/home/RealMoments';
import BrandSlideshow from '../components/home/BrandSlideshow';
import OurExpertsTeaser from '../components/home/OurExpertsTeaser';
import LuxuryTestimonials from '../components/home/LuxuryTestimonials';
import ProtectionStackSection from '../components/home/ProtectionStackSection';

export default function Home() {
  return (
    <div style={{ background: '#060B16' }}>
      <LuxuryHero />
      <LuxuryStatsBar />
      <OurExpertsTeaser />
      <LuxuryTrustBar />
      <LuxuryHowItWorks />
      <LuxuryWhyMorales />
      <ProtectionStackSection />
      <RealMoments />
      <LuxuryTestimonials />
      <BrandSlideshow />
    </div>
  );
}
