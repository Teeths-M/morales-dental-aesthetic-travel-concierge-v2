// @ts-nocheck — CSS spread loses literal types; capture prop is a valid HTML attribute
import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, User } from 'lucide-react';
import { validateFile } from '@/lib/validateFile';
import { UPLOAD_PRESETS } from '@/lib/constants';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';

const PROTECTED = {
  pointerEvents: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitUserDrag: 'none',
};

/**
 * IdentityCard — protected photo shown to the counterparty.
 * CSS blocks right-click / drag. Diagonal watermark burns into screenshots.
 * Only render when journey is active — caller is responsible for visibility gate.
 */
export function IdentityCard({ name, role, photoUrl, sublabel }) {
  return (
    <div style={{
      background: CARD, border: '1px solid #2A3F4A',
      borderRadius: 16, overflow: 'hidden', flex: 1, minWidth: 130,
    }}>
      <div
        style={{ aspectRatio: '4/3', background: '#07111A', position: 'relative', overflow: 'hidden' }}
        onContextMenu={e => e.preventDefault()}
      >
        {photoUrl ? (
          <img loading="lazy" decoding="async"
            src={photoUrl}
            alt={role}
            draggable={false}
            style={{ ...PROTECTED, width: '100%', height: '100%', objectFit: 'cover' }}
            onContextMenu={e => e.preventDefault()}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.1)' }} />
          </div>
        )}
        {/* Watermark — survives screenshots, discourages misuse */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: 8, color: 'rgba(212,175,55,0.22)', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            transform: 'rotate(-22deg)', userSelect: 'none', whiteSpace: 'nowrap',
          }}>
            MORALES · VERIFIED · SINGLE USE
          </span>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{name || '—'}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: GOLD, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{role}</p>
        {sublabel && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{sublabel}</p>}
      </div>
    </div>
  );
}

/**
 * IdentityUpload — photo upload card for partners / patients.
 * capture: 'user' = selfie camera | 'environment' = rear camera
 */
export function IdentityUpload({ label, hint, photoUrl, onUpload, uploading, capture = 'user' }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateFile(file, UPLOAD_PRESETS.IMAGE_UPLOAD);
    if (!check.valid) { setError(check.error); e.target.value = ''; return; }
    setError(null);
    await onUpload(file);
    e.target.value = '';
  };

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${photoUrl ? GOLD + '50' : '#2A3F4A'}`,
      borderRadius: 16, overflow: 'hidden', flex: 1, minWidth: 130,
    }}>
      <div
        style={{ aspectRatio: '4/3', background: '#07111A', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => !uploading && ref.current?.click()}
      >
        {photoUrl ? (
          <>
            <img loading="lazy" decoding="async" src={photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <CheckCircle2 style={{ width: 11, height: 11, color: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Uploaded</span>
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {uploading
              ? <div className="animate-spin" style={{ width: 24, height: 24, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
              : (
                <>
                  <Camera style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.2)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>Tap to upload</span>
                </>
              )
            }
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{hint}</p>}
        {error && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#ef4444', lineHeight: 1.4 }}>{error}</p>}
        <button
          onClick={() => !uploading && ref.current?.click()}
          disabled={uploading}
          style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: GOLD, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: uploading ? 0.4 : 1 }}
        >
          {photoUrl ? 'Change →' : 'Upload →'}
        </button>
        <input ref={ref} type="file" accept="image/*" capture={capture} style={{ display: 'none' }} onChange={handleChange} />
      </div>
    </div>
  );
}
