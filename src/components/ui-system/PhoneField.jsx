import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRY_DIAL, dialToFlag, formatPhoneE164, parsePhoneValue } from '@/lib/countryDialCodes';

/**
 * PhoneField — country dial-code selector (flag + code) + national-number input.
 * Replaces the app's plain "type your own +country code" text fields so an
 * anxious/low-literacy user never mistypes the code (which, on Login, silently
 * kills the OTP).
 *
 * Controlled: `value` is a single string, `onChange(next)` receives an E.164
 * value ("+15551234567") or '' when the number is empty (so existing empty-check
 * validation keeps working). Defaults its country from `defaultCountryName`
 * (e.g. IP-detected) when the value carries no country code.
 *
 * `dark` switches to the dark surfaces used by Login / ConsultationForm.
 */
export default function PhoneField({
  value = '',
  onChange,
  defaultCountryName = '',
  placeholder = 'Phone number',
  autoFocus = false,
  dark = false,
  id,
}) {
  const initial = parsePhoneValue(value, COUNTRY_DIAL);
  const [iso2, setIso2] = useState(initial.iso2 || null);
  const [national, setNational] = useState(initial.national || '');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  const selected =
    COUNTRY_DIAL.find((c) => c.iso2 === iso2) || COUNTRY_DIAL.find((c) => c.iso2 === 'US');

  // Default the country from a detected name only when the value gave us none.
  useEffect(() => {
    if (iso2 || !defaultCountryName) return;
    const match = COUNTRY_DIAL.find(
      (c) => c.name.toLowerCase() === String(defaultCountryName).toLowerCase()
    );
    if (match) setIso2(match.iso2);
  }, [defaultCountryName, iso2]);

  // Re-sync when the external value changes to something we didn't emit (e.g.
  // auth pre-fill arriving after mount). No emit here → can't fight the typer:
  // our own edits store exactly what we emit, so this no-ops on them.
  useEffect(() => {
    const current = formatPhoneE164(selected?.dial, national);
    if (value && value !== current) {
      const p = parsePhoneValue(value, COUNTRY_DIAL);
      if (p.iso2) setIso2(p.iso2);
      setNational(p.national || '');
    }
     
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pickCountry = (c) => {
    setIso2(c.iso2);
    setOpen(false);
    setQ('');
    onChange(formatPhoneE164(c.dial, national));
  };

  const onNational = (e) => {
    const next = e.target.value;
    setNational(next);
    onChange(formatPhoneE164(selected.dial, next));
  };

  const filtered = q.trim()
    ? COUNTRY_DIAL.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          `+${c.dial}`.includes(q.replace(/[^\d+]/g, ''))
      )
    : COUNTRY_DIAL;

  // Theme tokens
  const bg = dark ? 'rgba(255,255,255,0.05)' : '#EEF3F1';
  const border = dark ? '#2A3F4A' : '#E2E9E6';
  const text = dark ? '#fff' : '#17302C';
  const faint = dark ? 'rgba(255,255,255,0.5)' : '#8A9B96';
  const menuBg = dark ? '#0C1A1D' : '#FFFFFF';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', gap: 8 }}>
      {/* Country selector */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Select country code"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          padding: '0 12px', height: 44, borderRadius: 12, cursor: 'pointer',
          background: bg, border: `1px solid ${border}`, color: text, fontSize: 14, fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{dialToFlag(selected.iso2)}</span>
        <span>+{selected.dial}</span>
        <ChevronDown style={{ width: 14, height: 14, color: faint }} />
      </button>

      {/* National number */}
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoFocus={autoFocus}
        value={national}
        onChange={onNational}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, height: 44, padding: '0 14px', borderRadius: 12, boxSizing: 'border-box',
          background: bg, border: `1px solid ${border}`, color: text, fontSize: 15, outline: 'none',
        }}
      />

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 48, left: 0, zIndex: 50, width: 280, maxWidth: '90vw',
            background: menuBg, border: `1px solid ${border}`, borderRadius: 14,
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderBottom: `1px solid ${border}` }}>
            <Search style={{ width: 14, height: 14, color: faint, flexShrink: 0 }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country or code…"
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: text, fontSize: 13 }}
            />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 4, maxHeight: 240, overflowY: 'auto' }}>
            {filtered.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  onMouseDown={() => pickCountry(c)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: 'none',
                    background: c.iso2 === selected.iso2 ? (dark ? 'rgba(14,138,125,0.18)' : 'rgba(14,138,125,0.08)') : 'transparent',
                    color: text, fontSize: 13.5,
                  }}
                >
                  <span style={{ fontSize: 17 }}>{dialToFlag(c.iso2)}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: faint }}>+{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li style={{ padding: '10px 12px', color: faint, fontSize: 13 }}>No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
