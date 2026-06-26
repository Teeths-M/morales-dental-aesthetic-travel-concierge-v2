/**
 * SystemPauseToggle — admin control to pause/resume all Base44 API calls.
 *
 * When PAUSED:
 *   • base44.functions.invoke() is intercepted — returns null instantly, 0 credits used
 *   • React Query cancels all in-flight queries and stops polling intervals
 *   • A full-width red banner appears at the top of every page
 *   • State persists across page reloads (stored in localStorage)
 *
 * Use this when you need to conserve integration credits during development.
 */
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pauseSystem, resumeSystem, isSystemPaused } from '@/lib/systemPause';
import { Pause, Play, Zap } from 'lucide-react';

export default function SystemPauseToggle({ compact = false }) {
  const [paused, setPaused] = useState(isSystemPaused);
  const queryClient = useQueryClient();

  function toggle() {
    if (paused) {
      resumeSystem(queryClient);
      setPaused(false);
    } else {
      pauseSystem(queryClient);
      setPaused(true);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={paused ? 'System is PAUSED — click to resume' : 'Pause system to save integration credits'}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          width:          '100%',
          padding:        '8px 12px',
          borderRadius:   8,
          border:         'none',
          cursor:         'pointer',
          fontSize:       13,
          fontWeight:     600,
          transition:     'all 0.2s',
          background:     paused ? '#fef9c3' : '#fef2f2',
          color:          paused ? '#713f12' : '#991b1b',
        }}
      >
        {paused
          ? <><Play  style={{ width: 14, height: 14, flexShrink: 0 }} /> Resume System</>
          : <><Pause style={{ width: 14, height: 14, flexShrink: 0 }} /> Pause System</>
        }
        {paused && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#b45309',
            background: '#fef3c7', padding: '2px 6px', borderRadius: 999 }}>
            PAUSED
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        padding:        '10px 18px',
        borderRadius:   10,
        border:         paused ? '2px solid #f59e0b' : '2px solid #ef4444',
        cursor:         'pointer',
        fontSize:       13,
        fontWeight:     700,
        transition:     'all 0.2s',
        background:     paused ? '#fef3c7' : '#fee2e2',
        color:          paused ? '#92400e' : '#991b1b',
      }}
    >
      {paused
        ? <><Play  style={{ width: 16, height: 16 }} /> Resume All Functions</>
        : <><Pause style={{ width: 16, height: 16 }} /> Pause All Functions</>
      }
    </button>
  );
}

/**
 * SystemPauseBanner — shown at the top of all pages when system is paused.
 * Import this into AppLayout or AdminLayout.
 */
export function SystemPauseBanner() {
  const [paused, setPaused] = useState(isSystemPaused);
  const queryClient = useQueryClient();

  // Listen for storage changes (so other tabs sync)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'morales_system_paused') setPaused(e.newValue === 'true');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!paused) return null;

  return (
    <div style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      zIndex:         99999,
      background:     '#dc2626',
      color:          '#fff',
      padding:        '10px 16px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            12,
      boxShadow:      '0 4px 16px rgba(220,38,38,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap style={{ width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          SYSTEM PAUSED — All Base44 API calls are blocked. Integration credits are NOT being consumed.
        </span>
      </div>
      <button
        onClick={() => { resumeSystem(queryClient); setPaused(false); }}
        style={{
          flexShrink:   0,
          padding:      '5px 14px',
          borderRadius: 999,
          border:       '1.5px solid rgba(255,255,255,0.6)',
          background:   'transparent',
          color:        '#fff',
          fontWeight:   700,
          fontSize:     12,
          cursor:       'pointer',
        }}
      >
        ▶ Resume
      </button>
    </div>
  );
}
