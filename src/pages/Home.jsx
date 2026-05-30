import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import CinematicIntro from '../components/home/CinematicIntro';
import TarotSelection from '../components/home/TarotSelection';
import StatsBar from '../components/home/StatsBar';
import WhyChooseUs from '../components/home/WhyChooseUs';
import HowItWorks from '../components/home/HowItWorks';
import BrandSlideshow from '../components/home/BrandSlideshow';
import SlotCounter from '../components/home/SlotCounter';
import OurExpertsTeaser from '../components/home/OurExpertsTeaser';

export default function Home() {
  // 'intro' → 'tarot' → 'main'
  const [phase, setPhase] = useState('intro');
  const navigate = useNavigate();

  return (
    <div>
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CinematicIntro onComplete={() => setPhase('tarot')} />
          </motion.div>
        )}

        {phase === 'tarot' && (
          <motion.div
            key="tarot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <TarotSelection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — revealed after intro phase */}
      {phase !== 'intro' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <StatsBar />
          <SlotCounter className="mx-auto mt-6" />
          <OurExpertsTeaser />
          <WhyChooseUs />
          <BrandSlideshow />
          <HowItWorks />
        </motion.div>
      )}
    </div>
  );
}