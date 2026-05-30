import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CinematicIntro from '../components/home/CinematicIntro';
import TarotSelection from '../components/home/TarotSelection';
import ItineraryScroll from '../components/home/ItineraryScroll';
import ConversionEngine from '../components/home/ConversionEngine';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';
import BrandSlideshow from '../components/home/BrandSlideshow';
import SlotCounter from '../components/home/SlotCounter';
import OurExpertsTeaser from '../components/home/OurExpertsTeaser';

export default function Home() {
  // 'intro' → 'main'
  const [phase, setPhase] = useState('intro');

  return (
    <div style={{ background: '#050f09' }}>
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CinematicIntro onComplete={() => setPhase('main')} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'main' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Section 2: Choice Architecture */}
          <TarotSelection />

          {/* Section 3: Interactive Itinerary */}
          <ItineraryScroll />

          {/* Section 4: Conversion Engine */}
          <ConversionEngine />

          {/* Existing content sections */}
          <div style={{ background: '#fff' }}>
            <StatsBar />
            <SlotCounter className="mx-auto mt-6" />
            <OurExpertsTeaser />
            <WhyChooseUs />
            <BrandSlideshow />
            <HowItWorks />
          </div>
        </motion.div>
      )}
    </div>
  );
}