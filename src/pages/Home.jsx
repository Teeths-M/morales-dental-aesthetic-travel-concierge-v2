import React from 'react';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';

export default function Home() {
  return (
    <div>
      <Hero />
      <StatsBar />
      <WhyChooseUs />
      <HowItWorks />
    </div>
  );
}