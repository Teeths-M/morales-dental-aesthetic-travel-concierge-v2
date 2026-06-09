import React from 'react';
import LightNavbar from '../components/home/v2/LightNavbar';
import HeroSection from '../components/home/v2/HeroSection';
import ValuePropsGrid from '../components/home/v2/ValuePropsGrid';
import TrustSection from '../components/home/v2/TrustSection';
import HowItWorksSection from '../components/home/v2/HowItWorksSection';
import WhyMoralesSection from '../components/home/v2/WhyMoralesSection';
import LightFooter from '../components/home/v2/LightFooter';

export default function Home() {
  return (
    <div className="min-h-screen font-body" style={{ background: '#f8f9fb' }}>
      <LightNavbar />
      <HeroSection />
      <ValuePropsGrid />
      <TrustSection />
      <HowItWorksSection />
      <WhyMoralesSection />
      <LightFooter />
    </div>
  );
}