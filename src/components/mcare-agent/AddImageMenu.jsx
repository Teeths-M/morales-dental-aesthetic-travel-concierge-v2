import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Image as ImageIcon, Camera, Mic, Contact as ContactIcon,
  BarChart3, CalendarDays, Upload, Shield, MapPin,
} from 'lucide-react';

// AddImageMenu — the attach affordance in the M-Care/M-Safe input bar.
// variant="default" → compact dashed "Add image" label button (light agent page).
// variant="glass"   → icon-only dark control (legacy dark panel).
// variant="icon"    → icon-only light control (M-Safe white input bar, no dashed border).
//
// The popup is a dark charcoal vertical menu (matching the Telegram-style
// attachment sheet the builder supplied) with colored per-item icons.
// Each item routes to a real upload path:
//   Document / Photos & videos / Camera / Audio → device file input (accept varies)
//   Contact → secure vault upload (ID / insurance / passport)
//   Poll / Event → friendly "not supported in M-Care yet" toast (kept to honor the design)

const ITEMS = [
  { key: 'document', label: 'Document', icon: FileText, color: '#7b61ff', accept: '.pdf,.doc,.docx,.txt,.rtf' },
  { key: 'photos',   label: 'Photos & videos', icon: ImageIcon, color: '#2196f3', accept: 'image/*,video/*' },
  { key: 'camera',   label: 'Camera', icon: Camera, color: '#e91e63', accept: 'image/*', capture: 'environment' },
  { key: 'location', label: 'Location', icon: MapPin, color: '#10b981', location: true },
  { key: 'audio',    label: 'Audio', icon: Mic, color: '#ff9800', accept: 'audio/*' },
  { key: 'contact',  label: 'Contact', icon: ContactIcon, color: '#03a9f4', vault: true },
  { key: 'poll',     label: 'Poll', icon: BarChart3, color: '#ffc107', unsupported: 'M-Care doesn’t support polls.' },
  { key: 'event',    label: 'Event', icon: CalendarDays, color: '#f44336', unsupported: 'M-Care doesn’t support events.' },
];

export default function AddImageMenu({ onDeviceFile, onVaultClick, onLocationClick = null, disabled, uploading, variant = 'default', onUnsupported, menuTheme = 'dark' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);
  const acceptRef = useRef('image/*,application/pdf');
  const captureRef = useRef(undefined);
  const glass = variant === 'glass';
  // menuTheme='light' (mobile M-Safe redesign, 2026-08-28): the popup itself
  // was always hardcoded dark charcoal regardless of `variant` — this swaps
  // just its 3 hardcoded colors for a white panel, and recolors the trigger
  // icon gold. Default 'dark' keeps every existing caller (desktop MCareOrb,
  // any other consumer) byte-identical to before this prop existed.
  const light = menuTheme === 'light';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const chooseItem = (item) => {
    if (item.unsupported) {
      setOpen(false);
      onUnsupported?.(item.unsupported);
      return;
    }
    if (item.vault) {
      setOpen(false);
      onVaultClick?.();
      return;
    }
    if (item.location) {
      setOpen(false);
      onLocationClick?.();
      return;
    }
    acceptRef.current = item.accept;
    captureRef.current = item.capture;
    setOpen(false);
    // Let the accept/capture attributes apply before opening the picker
    requestAnimationFrame(() => fileRef.current?.click());
  };

  const triggerClass = glass
    ? "flex items-center justify-center w-9 h-9 rounded-[10px] border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
    : variant === 'icon'
      ? "flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors disabled:opacity-50"
      : "flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-dashed border-border text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50";

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={fileRef}
        type="file"
        accept={acceptRef.current}
        capture={captureRef.current}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onDeviceFile?.(f);
        }}
      />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={triggerClass}
        title="Attach a file"
        aria-label="Attach a file"
        style={light ? { color: '#D4AF37' } : undefined}
      >
        {uploading ? (
          <div className={`w-4 h-4 border-2 rounded-full animate-spin ${glass ? 'border-white/25 border-t-white' : light ? 'border-[#D4AF37]/30 border-t-[#D4AF37]' : 'border-primary/30 border-t-primary'}`} />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {variant === 'default' && <span className="text-[11px] font-medium leading-none">Attach</span>}
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 z-20 w-64 rounded-2xl shadow-2xl overflow-hidden"
          style={light ? { background: '#FFFFFF', border: '1px solid #E5E7EB' } : { background: '#1c1c1c', border: '1px solid #2a2a2a' }}
          role="menu"
        >
          {ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => chooseItem(item)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${light ? 'hover:bg-[#F8FAFC]' : 'hover:bg-[#2d2d2d]'}`}
              >
                <span className="flex-shrink-0 flex items-center justify-center" style={{ color: item.color }}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className={`text-sm font-medium ${light ? 'text-[#0F172A]' : 'text-white'}`}>{item.label}</span>
                {idx === 0 && <Shield className="w-3.5 h-3.5 ml-auto text-emerald-400/70" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}