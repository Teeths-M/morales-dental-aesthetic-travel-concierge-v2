import React from 'react';

/**
 * Purely presentational — reuses the gold-ring spinner style already
 * established in App.jsx's PageLoader for visual consistency.
 */
export default function PullToRefreshIndicator({ pullDistance, refreshing }) {
  if (!pullDistance && !refreshing) return null;

  const visibleHeight = refreshing ? 48 : pullDistance;

  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${visibleHeight}px`,
        overflow: 'hidden',
        transition: refreshing ? 'height 0.15s ease' : 'none',
      }}
    >
      <div
        className={`w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full ${refreshing ? 'animate-spin' : ''}`}
        style={{
          opacity: Math.min(visibleHeight / 48, 1),
          transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
        }}
      />
    </div>
  );
}
