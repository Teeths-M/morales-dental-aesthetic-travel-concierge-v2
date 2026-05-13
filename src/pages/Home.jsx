import React from 'react';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';
import HeroSlideshow from '../components/home/HeroSlideshow';
import BrandSlideshow from '../components/home/BrandSlideshow';

export default function Home() {
  return (
    <div>
      <Hero />
      <StatsBar />
      <HeroSlideshow />
      <WhyChooseUs />
      <BrandSlideshow />
      <HowItWorks />
    </div>
  );
}