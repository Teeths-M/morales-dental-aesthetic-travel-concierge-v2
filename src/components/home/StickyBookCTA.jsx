import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function StickyBookCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      padding: '12px 20px max(16px, env(safe-area-inset-bottom))',
      background: 'rgba(6, 11, 22, 0.96)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid rgba(42, 63, 74, 0.7)',
      display: 'flex', alignItems: 'center', gap: 14,
      transform: visible ? 'translateY(0)' : 'translateY(110%)',
      transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>Ready to start your journey?</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Free consultation · No commitment</p>
      </div>
      <Link
        to="/consultation"
        style={{
          flexShrink: 0,
          padding: '13px 22px', borderRadius: 99, textDecoration: 'none',
          background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)',
          color: '#060B16', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
          display: 'block',
        }}
      >
        Book Free Consult
      </Link>
    </div>
  );
}
