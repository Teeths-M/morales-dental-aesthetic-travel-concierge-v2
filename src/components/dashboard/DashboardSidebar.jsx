import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText,
  MessageCircle, Shield, Settings, Menu, ChevronRight,
  Stethoscope, Plane, AlertTriangle, Globe, Camera,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const PHOTO_KEY = 'morales_profile_photo';
const GOLD      = '#D4AF37';

const LUXURY_COLORS = {
  header:         'bg-gradient-to-br from-slate-900 to-slate-950',
  activeGradient: 'bg-gradient-to-br from-slate-800 to-slate-900',
  textPrimary:    'text-slate-700',
  textSecondary:  'text-slate-500',
  badge:          'bg-rose-400',
};

const NAV_ITEMS = Object.freeze([
  { icon: LayoutDashboard, label: 'Home',         path: '/dashboard' },
  { icon: Stethoscope,     label: 'Medical',       path: '/intake' },
  { icon: Plane,           label: 'Travel',         path: '/travel-intake' },
  { icon: Shield,          label: 'Safety',         path: '/safe-t' },
  { icon: FileText,        label: 'Documents',      path: '/passport-vault' },
  { icon: MessageCircle,   label: 'Messages',       path: '/dashboard/messages', badge: 2 },
  { icon: AlertTriangle,   label: 'Emergency',      path: '/emergency' },
  { icon: Settings,        label: 'Settings',       path: '/dashboard/settings' },
  { icon: Globe,           label: 'All Features',   path: '/dashboard/features' },
]);

// ── Profile Avatar — clickable, uploadable ────────────────────────────────────
function ProfileAvatar({ photo, uploading, onUpload }) {
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-selected
    if (!file) return;
    onUpload(file);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        aria-label="Upload profile photo"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex-shrink-0 focus:outline-none disabled:opacity-70"
        aria-label="Change profile photo"
        title="Tap to upload your photo"
        disabled={uploading}
        style={{ width: 48, height: 48 }}
      >
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-lg transition-all duration-200"
          style={{
            background: photo ? 'transparent' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: hovered ? `0 0 0 2px ${GOLD}, 0 4px 16px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {photo ? (
            <img loading="lazy" decoding="async" src={photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-serif font-semibold text-xl">M</span>
          )}
        </div>

        {/* Camera overlay on hover, or a spinner while the upload is saving */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center transition-opacity duration-200"
          style={{
            background: 'rgba(0,0,0,0.55)',
            opacity: hovered || uploading ? 1 : 0,
          }}
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Upload badge when no photo */}
        {!photo && !uploading && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: GOLD, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
          >
            <Camera className="w-2.5 h-2.5 text-slate-900" />
          </div>
        )}
      </button>
    </>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ location, onClose = null }) {
  const { user, checkUserAuth } = useAuth();
  // user.profile_photo_url (the durable, server-side copy) wins once loaded;
  // the localStorage cache only fills the gap before that first resolves, or
  // for an offline/preview session with no real backend to read from.
  const [photo, setPhoto] = useState(() => {
    if (user?.profile_photo_url) return user.profile_photo_url;
    try { return localStorage.getItem(PHOTO_KEY) || null; } catch { return null; }
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (user?.profile_photo_url && user.profile_photo_url !== photo) {
      setPhoto(user.profile_photo_url);
    }
  }, [user?.profile_photo_url, photo]);

  const _displayName  = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Patient';
  const fullName     = user?.full_name || 'My Portal';

  const handleUpload = useCallback(async (file) => {
    // Instant local preview via an object URL — no giant base64 string ever
    // touches localStorage, so there's no risk of silently hitting its quota.
    const previewUrl = URL.createObjectURL(file);
    setPhoto(previewUrl);
    setUploading(true);
    setUploadError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // FIX: this used to only write a base64 copy of the photo to
      // localStorage — nothing was ever sent to the backend, so it never
      // survived a different device/browser, an incognito session, or (as
      // reported) the Base44 preview environment's storage isolation.
      // updateMe() is the SDK's purpose-built self-update call for the
      // current session's own User record — no entity-level RLS change
      // needed for it (see CLAUDE.md's caution on editing User directly).
      await base44.auth.updateMe({ profile_photo_url: file_url });
      setPhoto(file_url);
      try { localStorage.setItem(PHOTO_KEY, file_url); } catch (_) {}
      checkUserAuth?.(); // refresh the shared user object so it's current everywhere
    } catch (err) {
      console.error('[DashboardSidebar] profile photo save failed:', err);
      setUploadError('Could not save your photo — please try again.');
      let fallback = user?.profile_photo_url || null;
      if (!fallback) {
        try { fallback = localStorage.getItem(PHOTO_KEY); } catch (_) { fallback = null; }
      }
      setPhoto(fallback);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploading(false);
    }
  }, [checkUserAuth, user?.profile_photo_url]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header: avatar + name + upload ── */}
      <div className={`${LUXURY_COLORS.header} px-5 py-6 mb-2`}>
        <div className="flex items-center gap-3">
          <ProfileAvatar photo={photo} uploading={uploading} onUpload={handleUpload} />

          <div className="flex-1 min-w-0">
            <p className="text-white font-serif font-semibold text-sm tracking-wide truncate">
              {fullName.toUpperCase()}
            </p>
            <p className="text-amber-400/70 text-[10px] tracking-widest uppercase">Patient Portal</p>
            {uploadError ? (
              <p className="text-rose-400 text-[9px] mt-0.5">{uploadError}</p>
            ) : !photo && (
              <p className="text-white/35 text-[9px] mt-0.5">Tap photo to upload</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? `${LUXURY_COLORS.activeGradient} text-white font-semibold shadow-lg shadow-slate-900/20 border border-slate-700/50`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : `${LUXURY_COLORS.badge} text-white`
                }`}>{badge}</span>
              )}
              {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-3">
        <Link to="/trip-overview">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl px-4 py-3 text-white text-center hover:opacity-90 transition-all shadow-lg shadow-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Globe className="w-4 h-4" />
              <p className="text-xs font-semibold">My Trip Overview</p>
            </div>
            <p className="text-[10px] text-white/80">View itinerary &amp; partners</p>
          </div>
        </Link>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-emerald-800 tracking-wide">SAFE-T 4LIFE™</p>
              <p className="text-[9px] text-emerald-600 font-medium">Active Protection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] text-emerald-700">Real-time monitoring enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSidebar() {
  const location    = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-400/30 rounded-xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white shadow-2xl h-full border-r border-slate-100">
            <SidebarContent location={location} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 shadow-xl shadow-slate-200/50 min-h-screen flex-shrink-0">
        <SidebarContent location={location} />
      </aside>
    </>
  );
}