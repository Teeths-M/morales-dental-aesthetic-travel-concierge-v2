import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, RotateCcw, Lock, Unlock,
  AlertTriangle, MessageSquare, Radio
} from 'lucide-react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

/* ── Scenario timeline ───────────────────────────────────────────────────── */
const TIMELINE = [
  {
    id: 'club_ok',
    delay: 0,
    type: 'safe',
    time: '11:30 PM',
    title: 'Solo Traveler Active — Nightlife Mode',
    detail: 'Marco activated Nightlife Safety Mode before entering Club Havana, El Poblado, Medellín. GPS beacon live.',
    phone: null,
  },
  {
    id: 'drugged',
    delay: 2800,
    type: 'warning',
    time: '01:15 AM',
    title: 'GPS Signal Dropped — Last Location Cached',
    detail: 'Live beacon stopped. Last known position: Calle 10 #43-28, El Poblado. Check-in window opened.',
    phone: null,
  },
  {
    id: 'borrowed',
    delay: 5200,
    type: 'escalate',
    time: '02:47 AM',
    title: 'Emergency Access — Stranger\'s Phone',
    detail: 'Marco regained consciousness. Borrowed a stranger\'s phone. Opened morales.app/emergency — token access, no app or password needed.',
    phone: 'token_login',
  },
  {
    id: 'vault_open',
    delay: 8000,
    type: 'escalate',
    time: '02:48 AM',
    title: 'Vault Opened — "I Need Help" Triggered',
    detail: 'Marco entered his 6-digit emergency PIN. Vault opened on the stranger\'s device. Tapped "I Need Help / Emergency Recovery".',
    phone: 'vault_help',
  },
  {
    id: 'help_sent',
    delay: 10500,
    type: 'critical',
    time: '02:48 AM',
    title: 'Emergency Broadcast Sent',
    detail: 'GPS coordinates transmitted. Emergency contacts notified. Private security dispatched to last beacon: El Poblado.',
    phone: 'help_sent',
    sms: {
      to: 'David Reyes — Emergency Contact',
      body: 'MORALES EMERGENCY: Marco has triggered Help/Recovery. Last GPS: 6.2076°N, 75.5758°W — El Poblado, Medellín. Security dispatched. Call +57-4-XXXX.',
    },
  },
  {
    id: 'lockdown',
    delay: 13200,
    type: 'critical',
    time: '02:51 AM',
    title: '🔒 VAULT LOCKDOWN — Breach Attempt Blocked',
    detail: 'Robbers attempted to access vault. 3 incorrect PINs entered. Vault entered full lockdown. Location of attempt logged and transmitted.',
    phone: 'lockdown',
    sms: {
      to: 'All Emergency Contacts + Security Team',
      body: 'MORALES LOCKDOWN: Unauthorized vault access attempted on Marco\'s account. 3 failed PINs. Device location: 6.2089°N, 75.5761°W — 120m from last beacon. Security alerted.',
    },
  },
  {
    id: 'security_arrives',
    delay: 16000,
    type: 'emergency',
    time: '03:18 AM',
    title: 'Security Team On-Site',
    detail: 'Private security reached El Poblado sector using GPS coordinates. Local police accompanying.',
    phone: null,
  },
  {
    id: 'safe',
    delay: 18500,
    type: 'rescue',
    time: '03:24 AM',
    title: '✅ MARCO RECOVERED — SAFE',
    detail: 'Marco located, medically assessed. Phone and belongings partially recovered. Vault remained locked throughout. Medical escort arranged.',
    phone: 'resolved',
    sms: {
      to: 'All Contacts',
      body: 'MORALES UPDATE: Marco has been located and is safe. Medical escort active. Vault secure — no data was compromised. — Morales Concierge',
    },
  },
];

const TYPE_STYLES = {
  safe:     { dot: '#22c55e', border: 'rgba(34,197,94,0.3)',  bg: 'rgba(34,197,94,0.06)',  label: '#22c55e' },
  warning:  { dot: '#f59e0b', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)', label: '#f59e0b' },
  escalate: { dot: '#f97316', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.06)', label: '#f97316' },
  critical: { dot: '#ef4444', border: 'rgba(239,68,68,0.3)',  bg: 'rgba(239,68,68,0.08)',  label: '#ef4444' },
  emergency:{ dot: '#dc2626', border: 'rgba(220,38,38,0.5)',  bg: 'rgba(220,38,38,0.12)',  label: '#fca5a5' },
  rescue:   { dot: GOLD,      border: `rgba(212,175,55,0.4)`, bg: `rgba(212,175,55,0.08)`, label: GOLD },
};

/* ── Phone mockup ────────────────────────────────────────────────────────── */
function PhoneMockup({ screen }) {
  return (
    <div
      className="mx-auto rounded-3xl overflow-hidden flex flex-col"
      style={{
        width: 200, height: 360,
        background: '#0a1015',
        border: '4px solid #1e2d35',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* Status bar */}
      <div className="flex justify-between items-center px-4 pt-3 pb-1 flex-shrink-0">
        <span className="text-[9px] text-white/50">02:4{screen === 'lockdown' ? '8' : '7'} AM</span>
        <div className="flex gap-1 items-center">
          <span className="text-[9px] text-white/50">●●●</span>
        </div>
      </div>

      {/* Screen content */}
      <div className="flex-1 px-3 pb-3 overflow-hidden">
        <AnimatePresence mode="wait">
          {screen === 'token_login' && (
            <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <div className="text-center mt-4 mb-4">
                <div className="w-10 h-10 rounded-2xl mx-auto mb-2 flex items-center justify-center font-bold text-base"
                  style={{ background: GOLD, color: DARK, fontFamily: 'Georgia, serif' }}>M</div>
                <p className="text-[10px] font-semibold text-white">Morales Emergency Access</p>
                <p className="text-[9px] mt-0.5" style={{ color: '#64748b' }}>No app required · Token login</p>
              </div>
              <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-[9px] text-center text-red-300 font-semibold">🆘 EMERGENCY ACCESS</p>
                <p className="text-[8px] text-center mt-1" style={{ color: '#94a3b8' }}>Enter your 6-digit emergency PIN</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
                  <div key={i} className="rounded-xl py-2 text-center text-xs font-semibold"
                    style={{ background: d === '' ? 'transparent' : '#1e2d35', color: '#e2e8f0' }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-1 mt-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i <= 4 ? GOLD : '#1e2d35' }} />
                ))}
              </div>
            </motion.div>
          )}

          {screen === 'vault_help' && (
            <motion.div key="vault" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 mt-2">
                <Unlock className="w-3 h-3" style={{ color: GOLD }} />
                <p className="text-[10px] font-semibold" style={{ color: GOLD }}>Vault Unlocked</p>
              </div>
              <div className="space-y-1.5 mb-3">
                {['Passport · USA', 'Travel Insurance', 'Emergency Contacts', 'Medical Info'].map(item => (
                  <div key={item} className="rounded-lg px-2.5 py-1.5 flex items-center gap-2"
                    style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                    <Lock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#475569' }} />
                    <span className="text-[9px] text-white">{item}</span>
                  </div>
                ))}
              </div>
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="rounded-xl py-3 text-center mt-auto"
                style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.5)' }}
              >
                <p className="text-[11px] font-bold text-red-300">🆘 I Need Help</p>
                <p className="text-[8px] mt-0.5" style={{ color: '#94a3b8' }}>Emergency Recovery</p>
              </motion.div>
            </motion.div>
          )}

          {screen === 'help_sent' && (
            <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center text-center px-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.5)' }}
              >
                <Radio className="w-7 h-7 text-red-400" />
              </motion.div>
              <p className="text-[11px] font-bold text-white mb-1">Help Request Sent</p>
              <p className="text-[8px] mb-3" style={{ color: '#64748b' }}>Broadcasting your last GPS coordinates</p>
              <div className="w-full rounded-lg p-2" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <p className="text-[8px] font-mono" style={{ color: GOLD }}>6.2076°N  75.5758°W</p>
                <p className="text-[7px] mt-0.5" style={{ color: '#475569' }}>El Poblado · Medellín</p>
              </div>
              <div className="mt-3 flex gap-1 flex-wrap justify-center">
                {['Contacts notified', 'Security dispatched', 'Location shared'].map(s => (
                  <span key={s} className="text-[7px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                    ✓ {s}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {screen === 'lockdown' && (
            <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center px-2">
              <motion.div
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ duration: 0.15, repeat: 6 }}
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(220,38,38,0.2)', border: '2px solid #dc2626' }}
              >
                <Lock className="w-7 h-7 text-red-400" />
              </motion.div>
              <p className="text-[12px] font-bold text-red-400 mb-1">VAULT LOCKED DOWN</p>
              <p className="text-[8px] mb-4" style={{ color: '#64748b' }}>3 incorrect PINs detected</p>
              <div className="w-full rounded-lg p-2 mb-2" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)' }}>
                <p className="text-[8px] text-red-300 font-semibold">⚠ Breach attempt logged</p>
                <p className="text-[7px] mt-1" style={{ color: '#94a3b8' }}>Attempt location transmitted to security team</p>
              </div>
              <div className="flex gap-1 flex-wrap justify-center">
                {['Data protected', 'Attempt logged', 'Security alerted'].map(s => (
                  <span key={s} className="text-[7px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                    🔒 {s}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {screen === 'resolved' && (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center px-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 font-bold text-2xl"
                style={{ background: GOLD, color: DARK, fontFamily: 'Georgia, serif',
                  boxShadow: `0 0 30px rgba(212,175,55,0.5)` }}>
                M
              </div>
              <p className="text-[11px] font-bold mb-1" style={{ color: GOLD }}>Marco is Safe</p>
              <p className="text-[8px]" style={{ color: '#64748b' }}>Vault secure · Data intact</p>
              <p className="text-[8px] mt-1" style={{ color: '#64748b' }}>Medical escort active</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── SMS popup ───────────────────────────────────────────────────────────── */
function SmsPopup({ sms, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: '#0C1A1D', border: '1px solid rgba(239,68,68,0.4)' }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
        <MessageSquare className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs font-semibold text-red-300 truncate">{sms.to}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{sms.body}</p>
      </div>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function NightlifeRobberyDemo({ minimal = false }) {
  const [playing, setPlaying]    = useState(false);
  const [visible, setVisible]    = useState(new Set(['club_ok']));
  const [phoneScreen, setPhone]  = useState(null);
  const [activeSms, setActiveSms]= useState(null);
  const [done, setDone]          = useState(false);
  const timers = useRef([]);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }

  function reset() {
    clearTimers();
    setPlaying(false);
    setVisible(new Set(['club_ok']));
    setPhone(null);
    setActiveSms(null);
    setDone(false);
  }

  function play() {
    reset();
    setPlaying(true);

    TIMELINE.forEach(evt => {
      const t = setTimeout(() => {
        setVisible(prev => new Set([...prev, evt.id]));
        if (evt.phone)  setPhone(evt.phone);
        if (evt.sms)    setActiveSms(evt.sms);
        if (evt.id === 'safe') { setDone(true); setPlaying(false); }
      }, evt.delay);
      timers.current.push(t);
    });
  }

  useEffect(() => () => clearTimers(), []);

  return (
    <div style={{ background: DARK, minHeight: minimal ? undefined : '100vh' }}>

      {/* NAV — hidden when embedded as a tab */}
      {!minimal && (
        <nav className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(6,11,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/demo" className="flex items-center gap-2 text-xs font-medium" style={{ color: '#64748b' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Demo
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
            🔒 Vault Lockdown Simulator
          </span>
          <div className="w-24" />
        </nav>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* HEADER */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
          >
            <Radio className="w-3 h-3" /> Simulated Incident · Real Vault Response
          </motion.div>
          <h1 className="text-4xl font-bold mb-3 leading-tight"
            style={{ color: '#f8fafc', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
            Drugged. Robbed.<br />
            <span style={{ color: GOLD }}>He Saved Himself.</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Marco was robbed at a Medellín nightclub. He borrowed a stranger's phone, opened Morales Emergency Access, triggered help — and when the robbers tried to break into his vault, the system locked them out and sent their location to security.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6 items-start">

          {/* LEFT — Phone + Patient */}
          <div className="md:col-span-2 space-y-4">

            {/* Patient */}
            <div className="rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Patient Profile</p>
              <div className="flex items-center gap-3 mb-4">
                <img src="https://i.pravatar.cc/150?img=12" alt="Marco Delgado"
                  className="w-14 h-14 rounded-full flex-shrink-0"
                  style={{ border: `3px solid ${GOLD}`, boxShadow: `0 0 14px rgba(212,175,55,0.35)`, objectFit: 'cover' }}
                />
                <div>
                  <p className="font-semibold text-white text-sm">Marco Delgado</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>28 · Solo Traveler · Spain</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>Gastric Sleeve · Medellín, COL</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Nightlife Mode', val: '🟢 Active' },
                  { label: 'Vault PIN', val: '6-digit · PBKDF2' },
                  { label: 'Emergency Access', val: 'Token · Any device' },
                  { label: 'Lockdown Threshold', val: '3 failed attempts' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: '#475569' }}>{label}</span>
                    <span className="font-medium text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup */}
            <AnimatePresence>
              {phoneScreen && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-3 text-center" style={{ color: '#64748b' }}>
                    {phoneScreen === 'lockdown' ? "Robber's Attempt" : "Marco's Borrowed Phone"}
                  </p>
                  <PhoneMockup screen={phoneScreen} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT — Incident log */}
          <div className="md:col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d35' }}>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>Incident Log</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Auto-generated · Case #INC-2024-1103</p>
                </div>
                <div className="flex gap-2">
                  {!playing && !done && (
                    <button onClick={play}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: '#ef4444', color: '#fff' }}>
                      <Play className="w-3 h-3" /> Run Scenario
                    </button>
                  )}
                  {playing && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> Live
                    </div>
                  )}
                  {done && (
                    <button onClick={reset}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: '#1e2d35', color: '#94a3b8', border: '1px solid #2A3F4A' }}>
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                {!playing && !done && visible.size === 1 && (
                  <div className="text-center py-8">
                    <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: '#475569' }} />
                    <p className="text-sm font-semibold text-white mb-1">Vault Lockdown Simulator</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Press Run Scenario to watch Marco save himself</p>
                  </div>
                )}

                <AnimatePresence>
                  {TIMELINE.filter(e => visible.has(e.id)).map(evt => {
                    const s = TYPE_STYLES[evt.type];
                    return (
                      <motion.div key={evt.id}
                        initial={{ opacity: 0, x: -16, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${s.border}`, background: s.bg }}>
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                              style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}80` }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-semibold text-white leading-tight">{evt.title}</p>
                                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: s.label }}>{evt.time}</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{evt.detail}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {playing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2d35' }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }}
                        animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                        transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                    ))}
                    <span className="text-xs" style={{ color: '#475569' }}>System processing…</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Vault security facts */}
            <div className="mt-4 rounded-2xl p-4" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#64748b' }}>Vault Security Architecture</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Encryption', val: 'PBKDF2-SHA256 · 600k rounds' },
                  { label: 'Access', val: 'Token-based · Any browser' },
                  { label: 'Lockdown', val: '3 failed PINs → full lock' },
                  { label: 'Breach log', val: 'Device location transmitted' },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: '#0a1420', border: '1px solid #1e3040' }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>{label}</p>
                    <p className="text-[10px] text-white">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 text-center space-y-4">
          <p className="text-sm" style={{ color: '#475569' }}>
            Marco saved himself using <span className="text-white font-semibold">a stranger's phone</span> and a 6-digit PIN he memorized. The vault protected everything. The robbers got nothing.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/demo/emergency"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle className="w-4 h-4" /> Kidnapping Scenario
            </Link>
            <Link to="/demo"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#0C1A1D', color: '#94a3b8', border: '1px solid #2A3F4A' }}>
              <ArrowLeft className="w-4 h-4" /> Platform Overview
            </Link>
            <Link to="/intake"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: GOLD, color: DARK }}>
              Travel Protected
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeSms && (
          <SmsPopup key={activeSms.body} sms={activeSms} onDismiss={() => setActiveSms(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
