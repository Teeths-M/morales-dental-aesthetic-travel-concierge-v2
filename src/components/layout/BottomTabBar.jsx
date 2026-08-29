import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Route as RouteIcon, FileText, MessageCircle, Globe } from 'lucide-react';

// Matches Tailwind's default `lg` breakpoint, which this bar hides at (`lg:hidden`).
const LG_BREAKPOINT_PX = 1024;
const BAR_HEIGHT_PX = 62;

/**
 * Other fixed-position elements (GuardianTicker, MCareOrb's floating launcher)
 * already read `var(--sticky-cta-height, 0px)` in their own `bottom` calc —
 * the same pattern StickyBookCTA.jsx uses to announce its own height. This
 * does the same for this bar so those elements move up above it on mobile
 * without editing their positioning logic.
 */
function useBottomTabBarHeightVar() {
  useEffect(() => {
    const update = () => {
      const height = window.innerWidth < LG_BREAKPOINT_PX ? `${BAR_HEIGHT_PX}px` : '0px';
      document.documentElement.style.setProperty('--bottom-tab-bar-height', height);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.documentElement.style.setProperty('--bottom-tab-bar-height', '0px');
    };
  }, []);
}

/**
 * Mobile primary nav (below the `lg` breakpoint, where DashboardSidebar's
 * desktop rail is hidden and patients otherwise have no persistent nav
 * outside the top hamburger). Five items chosen with Portia from the
 * existing DashboardSidebar precedent, distilled for a bottom bar: Home,
 * Journey, Documents, Messages, More (the existing Features hub — no new
 * page). Deliberately no unread-count badge on Messages — the sidebar's own
 * badge is hardcoded fake data, not live, and this doesn't replicate that.
 */
const TABS = Object.freeze([
  { icon: LayoutDashboard, label: 'Home',     path: '/dashboard' },
  { icon: RouteIcon,       label: 'Journey',  path: '/dashboard/journey' },
  { icon: FileText,        label: 'Documents', path: '/passport-vault' },
  { icon: MessageCircle,   label: 'Messages', path: '/dashboard/messages' },
  { icon: Globe,           label: 'More',     path: '/dashboard/features' },
]);

/**
 * Pure — exported for unit testing. `/dashboard` itself only matches exactly
 * (no startsWith) so it doesn't light up for every other /dashboard/* path;
 * every other tab matches its path as a prefix. Several real /dashboard/*
 * routes (settings, support, documents, etc.) intentionally match none of
 * these — they still work, just show no highlighted tab.
 */
export function isTabActive(pathname, tabPath) {
  return pathname === tabPath || (tabPath !== '/dashboard' && pathname.startsWith(tabPath));
}

export default function BottomTabBar() {
  const location = useLocation();
  useBottomTabBarHeightVar();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary"
    >
      {TABS.map(({ icon: Icon, label, path }) => {
        const isActive = isTabActive(location.pathname, path);
        return (
          <Link
            key={path}
            to={path}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0"
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="bottom-tab-indicator"
                className="absolute top-0 w-8 h-0.5 rounded-full bg-slate-900"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
            </motion.div>
            <span className={`text-[10px] truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
