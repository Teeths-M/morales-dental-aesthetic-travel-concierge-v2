import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Activity, Brain, Shield, UserCheck, Globe, HeartPulse } from 'lucide-react';

const STEPS = [
  { num: '01', icon: Activity, label: 'Health Intake', detail: 'Detailed medical screening' },
  { num: '02', icon: Brain, label: 'AI Risk Scan', detail: 'SAFE-T algorithm assessment' },
  { num: '03', icon: Shield, label: 'Safety Clearance', detail: 'Cleared, flagged, or blocked' },
  { num: '04', icon: UserCheck, label: 'Doctor Matched', detail: 'Verified specialist assigned' },
  { num: '05', icon: Globe, label: 'Travel Secured', detail: 'Full logistics coordinated' },
  { num: '06', icon: HeartPulse, label: 'Care & Recovery', detail: '7-day post-op monitoring' },
];

export default function AssessmentFlow() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-100px' });
  const [activeStep, setActiveStep] = useState(-1);
  const lineControls = useAnimation();
  const timeoutRefs = useRef([]);

  useEffect(() => {
    // Clear any running timeouts on re-trigger or exit
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    if (!isInView) {
      // Reset everything when scrolled out
      setActiveStep(-1);
      lineControls.set({ scaleX: 0 });
      return;
    }

    // Replay animation sequence
    lineControls.start({ scaleX: 1, transition: { duration: 1.4, ease: 'easeInOut' } });

    STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setActiveStep(i);
      }, 300 + i * 220);
      timeoutRefs.current.push(t);
    });
  }, [isInView]);

  return (
    <div className="mb-16" ref={ref}>
      <div className="text-center mb-10">
        <p className="text-xs font-bold text-white/40 uppercase tracking-[0.25em]">The Assessment Flow</p>
      </div>

      <div className="relative">
        {/* Background static line */}
        <div className="hidden lg:block absolute top-8 left-[8%] right-[8%] h-px bg-white/10" />

        {/* Animated glowing lines - forward and return (door-to-door) */}
        <div className="hidden lg:block absolute top-8 left-[8%] right-[8%] h-px overflow-hidden">
          {/* Forward line - left to right */}
          <motion.div
            className="absolute h-full origin-left"
            style={{
              background: 'linear-gradient(90deg, hsl(30,35%,49%), hsl(156,28%,40%), hsl(30,35%,49%))',
              boxShadow: '0 0 8px 2px hsl(30,35%,49%,0.6)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
          {/* Return line - right to left (door-to-door experience) */}
          <motion.div
            className="absolute h-full origin-right"
            style={{
              background: 'linear-gradient(90deg, hsl(30,35%,49%), hsl(156,28%,40%), hsl(30,35%,49%))',
              boxShadow: '0 0 8px 2px hsl(30,35%,49%,0.6)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut', delay: 1.4 }}
          />
        </div>

        {/* Traveling pulse dot - forward and return journey */}
        {isInView && (
          <div className="hidden lg:block absolute top-[26px] left-[8%] right-[8%] h-4 pointer-events-none">
            {/* Forward journey */}
            <motion.div
              className="absolute w-4 h-4 -translate-y-1/2 top-1/2 rounded-full"
              style={{
                background: 'hsl(30,35%,60%)',
                boxShadow: '0 0 12px 4px hsl(30,35%,49%,0.8)',
              }}
              initial={{ left: '0%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 0 }}
            />
            {/* Return journey - door-to-door */}
            <motion.div
              className="absolute w-4 h-4 -translate-y-1/2 top-1/2 rounded-full"
              style={{
                background: 'hsl(30,35%,60%)',
                boxShadow: '0 0 12px 4px hsl(30,35%,49%,0.8)',
              }}
              initial={{ left: '100%' }}
              animate={{ left: '0%' }}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 1.4 }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STEPS.map(({ num, icon: Icon, label, detail }, i) => {
            const isActive = activeStep >= i;
            return (
              <motion.div
                key={num}
                className="text-center relative"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                {/* Step icon box */}
                <motion.div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center relative z-10 mb-3 backdrop-blur-sm transition-all duration-500"
                  animate={isActive ? {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderColor: 'hsl(30,35%,49%)',
                    boxShadow: '0 0 20px 4px hsl(30,35%,49%,0.35)',
                  } : {
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    boxShadow: 'none',
                  }}
                  style={{ border: '1px solid' }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <Icon
                      className="w-6 h-6 transition-colors duration-500"
                      style={{ color: isActive ? 'hsl(30,35%,65%)' : 'rgba(255,255,255,0.4)' }}
                    />
                  </motion.div>

                  {/* Ping effect on activation */}
                  {isActive && (
                    <motion.span
                      className="absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ border: '1px solid hsl(30,35%,49%)' }}
                    />
                  )}
                </motion.div>

                <motion.div
                  className="text-[10px] font-black tracking-widest mb-1 transition-colors duration-500"
                  animate={{ color: isActive ? 'hsl(30,35%,60%)' : 'rgba(255,255,255,0.3)' }}
                >
                  {num}
                </motion.div>
                <motion.p
                  className="text-xs font-bold transition-colors duration-500"
                  animate={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)' }}
                >
                  {label}
                </motion.p>
                <motion.p
                  className="text-[11px] mt-0.5 transition-colors duration-500"
                  animate={{ color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}
                >
                  {detail}
                </motion.p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}