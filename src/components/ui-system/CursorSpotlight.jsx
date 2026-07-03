import { useEffect, useRef } from 'react';

export default function CursorSpotlight() {
  const el = useRef(null);

  useEffect(() => {
    // Direct DOM update — zero React re-renders, stays silky at 60fps
    const move = (e) => {
      if (!el.current) return;
      el.current.style.background =
        `radial-gradient(700px circle at ${e.clientX}px ${e.clientY}px, rgba(212,175,55,0.05) 0%, transparent 65%)`;
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={el}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
