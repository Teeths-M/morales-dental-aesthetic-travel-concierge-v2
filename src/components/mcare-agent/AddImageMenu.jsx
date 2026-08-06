import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Upload, Shield } from 'lucide-react';

// AddImageMenu — the "Add image" affordance in the M-Care input bar.
// variant="default" → light/token styling (the M-Care agent page).
// variant="glass"   → dark-glass styling (the floating MCareOrb panel).
// Opens a small upload menu: device attachment or secure-vault upload.
// Closes on outside click or after a choice.

export default function AddImageMenu({ onDeviceFile, onVaultClick, disabled, uploading, variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);
  const glass = variant === 'glass';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pickDevice = () => { setOpen(false); fileRef.current?.click(); };
  const pickVault = () => { setOpen(false); onVaultClick?.(); };

  const triggerClass = glass
    ? "flex items-center justify-center w-9 h-9 rounded-[10px] border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
    : "flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-dashed border-border text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50";

  const popoverClass = glass
    ? "absolute bottom-full mb-2 left-0 z-20 w-60 rounded-xl border border-white/12 bg-[#0c1218] text-white shadow-2xl overflow-hidden"
    : "absolute bottom-full mb-2 left-0 z-20 w-60 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden";

  const itemClass = glass
    ? "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-white/10 text-left transition-colors"
    : "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-secondary text-left transition-colors";

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
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
        title="Add an image or document"
        aria-label="Add image"
      >
        {uploading ? (
          <div className={`w-4 h-4 border-2 rounded-full animate-spin ${glass ? 'border-white/25 border-t-white' : 'border-primary/30 border-t-primary'}`} />
        ) : (
          <ImageIcon className="w-4 h-4" />
        )}
        {!glass && <span className="text-[11px] font-medium leading-none">Add image</span>}
      </button>

      {open && (
        <div className={popoverClass}>
          <div className="p-1">
            <MenuItem className={itemClass} icon={<Upload className="w-4 h-4" />} label="Upload from device" onClick={pickDevice} />
          </div>
          <div className={`h-px mx-2 ${glass ? 'bg-white/10' : 'bg-border'}`} />
          <div className="p-1">
            <MenuItem className={itemClass} icon={<Shield className="w-4 h-4 text-emerald-500" />} label="Upload to secure vault" onClick={pickVault} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ className, icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={className}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}