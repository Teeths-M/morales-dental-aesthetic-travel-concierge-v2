import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Upload, Shield } from 'lucide-react';

// AddImageMenu — the dashed "Add image" button from the logbook screenshot.
// Tapping it opens a small upload menu (two groups, divided like the reference):
//   1. Upload from device  → attach an image/PDF straight into the M-Care chat
//   2. Upload to secure vault → open the encrypted-vault modal (license/ID/insurance)
// The menu closes on outside click or after a choice.

export default function AddImageMenu({ onDeviceFile, onVaultClick, disabled, uploading }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pickDevice = () => {
    setOpen(false);
    fileRef.current?.click();
  };

  const pickVault = () => {
    setOpen(false);
    onVaultClick?.();
  };

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

      {/* Dashed "Add image" affordance — matches the logbook reference */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border px-3 py-2 text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
        title="Add an image or document"
        aria-label="Add image"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : (
          <ImageIcon className="w-5 h-5" />
        )}
        <span className="text-[11px] font-medium leading-none">Add image</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-20 w-60 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
          <div className="p-1">
            <MenuItem icon={<Upload className="w-4 h-4" />} label="Upload from device" onClick={pickDevice} />
          </div>
          <div className="h-px bg-border mx-2" />
          <div className="p-1">
            <MenuItem icon={<Shield className="w-4 h-4 text-emerald-600" />} label="Upload to secure vault" onClick={pickVault} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-secondary text-left transition-colors"
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}