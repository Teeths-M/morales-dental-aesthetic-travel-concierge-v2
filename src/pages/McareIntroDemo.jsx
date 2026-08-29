/**
 * McareIntroDemo — thin page wrapper at /demo/mcare-intro. Renders the real
 * McareIntro.jsx cinematic sequence full-screen; this page itself has no
 * other content, since the intro component already covers the entire
 * viewport (position:fixed, inset:0) above the Header/Footer/BottomTabBar
 * every public route otherwise renders inside.
 */
import React from 'react';
import McareIntro from '@/components/mcare/McareIntro';

export default function McareIntroDemo() {
  return <McareIntro />;
}
