import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-screen concentric ring + heart pulse animation.
 * Props:
 *   colors: string[]  — 1 or 2 hex colors
 *   show: boolean
 *   onDone: () => void
 */
export default function HeartRingAnimation({ colors = ['#EF4444'], show, onDone }) {
  const [rings, setRings] = useState([]);
  const primary = colors[0] || '#EF4444';
  const secondary = colors[1] || null;

  useEffect(() => {
    if (!show) return;
    // Spawn 5 rings staggered
    const ids = [0, 1, 2, 3, 4].map((i) => ({
      id: Date.now() + i,
      delay: i * 0.18,
      color: secondary && i % 2 === 1 ? secondary : primary,
    }));
    setRings(ids);

    const timer = setTimeout(() => {
      setRings([]);
      onDone?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden">
          {/* Rings */}
          {rings.map((ring) => (
            <motion.div
              key={ring.id}
              className="absolute rounded-full"
              initial={{ width: 60, height: 60, opacity: 0.45 }}
              animate={{ width: '220vmax', height: '220vmax', opacity: 0 }}
              transition={{ duration: 2.2, delay: ring.delay, ease: [0.2, 0, 0.6, 1] }}
              style={{
                border: `2px solid ${ring.color}`,
                boxShadow: `0 0 24px ${ring.color}60`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}