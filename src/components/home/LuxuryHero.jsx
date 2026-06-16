import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import { BadgeCheck, Shield, Plane, Heart, ShieldCheck, Headphones, Building2, BarChart3, HeartPulse } from 'lucide-react';

const GOLD = '#c9a84c';
const NAVY = '#0a1628';
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e35e484d5_generated_image.png';

const orbitNodes = [
  { label: 'Verified Specialists', icon: ShieldCheck, angle: 270, r: 158 },
  { label: '24/7 Support',         icon: Headphones,  angle: 195, r: 158 },
  { label: 'Safe Facilities',      icon: Building2,   angle: 345, r: 158 },
  { label: 'Risk Intelligence',    icon: BarChart3,   angle: 160, r: 158 },
  { label: 'Travel Coordination',  icon: Plane,       angle: 18,  r: 158 },
  { label: 'Recovery Care',        icon: HeartPulse,  angle: 108, r: 158 },
];

function deg2rad(d) { return (d * Math.PI) / 180; }

function HeroOrb() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <style>{`
        @keyframes orb-spin   { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes orb-spin-r { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes orb-pulse  { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.85;transform:scale(1.06)} }
        @keyframes float-chip { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-6px)} }
      `}</style>

      {/* Ambient glow layers */}
      <div style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}22 0%, ${GOLD}09 40%, transparent 70%)`,
        animation: 'orb-pulse 5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}18 0%, transparent 65%)`,
        animation: 'orb-pulse 3.5s ease-in-out infinite',
        animationDelay: '-1.2s',
      }} />

      {/* Outer decorative rings */}
      <div style={{ position:'absolute', width:370, height:370, borderRadius:'50%', border:`1px solid ${GOLD}44` }} />
      <div style={{ position:'absolute', width:310, height:310, borderRadius:'50%', border:`1px dashed ${GOLD}33` }} />
      <div style={{ position:'absolute', width:230, height:230, borderRadius:'50%', border:`1px solid ${GOLD}28` }} />

      {/* Spinning star rings */}
      {[18, 26, 34].map((dur, idx) => (
        <svg key={idx} style={{
          position:'absolute', width:370, height:370,
          animation: `${idx % 2 === 1 ? 'orb-spin-r' : 'orb-spin'} ${dur}s linear infinite`,
          animationDelay: `${-idx * 6}s`,
        }} viewBox="0 0 370 370">
          {[0, 90, 180, 270].map((startDeg, si) => {
            const rad = (startDeg * Math.PI) / 180;
            const cx = 185 + 183 * Math.sin(rad);
            const cy = 185 - 183 * Math.cos(rad);
            return (
              <g key={si}>
                <circle cx={cx} cy={cy} r={3 - idx * 0.6} fill={GOLD} opacity={0.9 - idx * 0.18} />
                <circle cx={cx} cy={cy} r={6 - idx} fill={GOLD} opacity={0.12} />
              </g>
            );
          })}
        </svg>
      ))}

      {/* Glowing endpoint dots on orbit path */}
      <svg style={{ position:'absolute' }} width="400" height="400" viewBox="-200 -200 400 400">
        {orbitNodes.map(({ angle, r, label }) => {
          const x = r * Math.cos(deg2rad(angle));
          const y = r * Math.sin(deg2rad(angle));
          return (
            <g key={`dot-${label}`}>
              <circle cx={x} cy={y} r={6}   fill={GOLD} opacity="0.1" />
              <circle cx={x} cy={y} r={2.5} fill={GOLD} opacity="0.95" />
            </g>
          );
        })}
      </svg>

      {/* Floating label chips */}
      {orbitNodes.map(({ label, icon: NodeIcon, angle, r }) => {
        const x = r * Math.cos(deg2rad(angle));
        const y = r * Math.sin(deg2rad(angle));
        const delay = (angle / 360) * 4;
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px)`,
              top:  `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              animation: `float-chip 4s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              background: 'rgba(5,10,22,0.85)',
              border: `1px solid ${GOLD}44`,
              backdropFilter: 'blur(14px)',
              borderRadius: 999,
              padding: '7px 14px',
              display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.88)',
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 24px rgba(0,0,0,0.55)`,
            }}
          >
            <NodeIcon style={{ width:13, height:13, color: GOLD, flexShrink:0, filter:`drop-shadow(0 0 5px ${GOLD}cc)` }} strokeWidth={1.5} />
            {label}
          </div>
        );
      })}

      {/* Center shield */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center' }}
      >
        <svg viewBox="0 0 80 92" fill="none" style={{ width:82, height:94 }}>
          <path d="M40 4L72 18V48C72 66 58 78 40 88C22 78 8 66 8 48V18L40 4Z"
            fill="none" stroke={GOLD} strokeWidth="3" opacity="0.12" />
          <path d="M40 6L70 19V48C70 65 57 76 40 86C23 76 10 65 10 48V19L40 6Z"
            fill={`${GOLD}18`} stroke={GOLD} strokeWidth="1.4" />
          <path d="M35 32H45V40H53V50H45V58H35V50H27V40H35V32Z"
            fill="white" opacity="0.92" />
        </svg>
        <p style={{ color: GOLD, fontSize:9.5, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', marginTop:10 }}>
          SAFE-T4LIFE™
        </p>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:7, letterSpacing:'0.16em', textTransform:'uppercase', marginTop:3 }}>
          Safety Intelligence Engine
        </p>
      </motion.div>
    </div>
  );
}

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section
        style={{
          background: NAVY,
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          marginTop: '-68px',
          paddingTop: '68px',
        }}
      >
        {/* Full-bleed background image */}
        <div style={{ position:'absolute', inset:0 }}>
          <img src={HERO_IMAGE} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'70% center' }} />
          {/* Left fade so text is readable */}
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(to right, ${NAVY} 0%, ${NAVY} 30%, rgba(10,22,40,0.88) 48%, rgba(10,22,40,0.35) 68%, transparent 100%)` }} />
          {/* Top + bottom fades */}
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom, ${NAVY} 0%, rgba(10,22,40,0.3) 8%, transparent 18%)` }} />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(to top, ${NAVY} 0%, rgba(10,22,40,0.6) 10%, transparent 25%)` }} />
        </div>

        <div style={{
          position:'relative', zIndex:10, maxWidth:1380, margin:'0 auto',
          padding:'0 32px', display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:0, alignItems:'center', minHeight:'100vh',
        }} className="px-5 lg:px-12 grid-cols-1 lg:grid-cols-2">

          {/* ── LEFT ── */}
          <motion.div
            initial={{ opacity:0, y:30 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.8, ease:'easeOut' }}
            style={{ display:'flex', flexDirection:'column', paddingRight:48, paddingTop:80, paddingBottom:80 }}
          >
            {/* Eyebrow */}
            <p style={{
              color: GOLD, fontSize:10.5, fontWeight:700,
              letterSpacing:'0.28em', textTransform:'uppercase', marginBottom:28,
            }}>
              World-Class Care. Personalized For You.
            </p>

            {/* Headline */}
            <h1 style={{
              fontFamily:'"Playfair Display", Georgia, serif',
              lineHeight:1.08, marginBottom:28, color:'#fff',
              fontSize:'clamp(2.6rem, 4.2vw, 4rem)',
            }}>
              Premium Medical Travel.<br />
              <em style={{ color: GOLD, fontStyle:'italic' }}>Verified. Safe.</em><br />
              Seamless.
            </h1>

            {/* Body */}
            <p style={{
              fontSize:15, color:'rgba(255,255,255,0.52)', lineHeight:1.75,
              marginBottom:40, maxWidth:440,
              fontFamily:'Inter, system-ui, sans-serif',
            }}>
              Morales coordinates your entire medical journey — from verified specialist
              matching and travel logistics to recovery care — with white-glove concierge
              support at every step.
            </p>

            {/* CTAs */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:48 }}>
              <Link
                to="/booking"
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  padding:'14px 28px', borderRadius:10, fontWeight:600,
                  fontSize:14, background: GOLD, color: NAVY,
                  boxShadow:`0 0 32px ${GOLD}38`,
                  textDecoration:'none', transition:'opacity .2s',
                  fontFamily:'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.88'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}
              >
                Book Your Consultation →
              </Link>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display:'inline-flex', alignItems:'center', gap:10,
                  padding:'14px 28px', borderRadius:10, fontWeight:600,
                  fontSize:14, background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.22)', color:'#fff',
                  cursor:'pointer', transition:'all .2s',
                  fontFamily:'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.38)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.22)'; }}
              >
                <span style={{
                  width:24, height:24, borderRadius:'50%',
                  border:'1px solid rgba(255,255,255,0.28)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,
                }}>▶</span>
                How It Works
              </button>
            </div>

            {/* Trust bar */}
            <div style={{
              borderTop:'1px solid rgba(255,255,255,0.08)',
              paddingTop:24,
              display:'flex', flexWrap:'wrap', gap:'8px 32px',
            }}>
              {['Verified Specialists','Transparent Pricing','End-to-End Concierge','Recovery Support'].map(t => (
                <span key={t} style={{
                  fontSize:11.5, color:'rgba(255,255,255,0.45)',
                  letterSpacing:'0.06em', fontFamily:'Inter, system-ui, sans-serif',
                }}>
                  <span style={{ color: GOLD, marginRight:6 }}>•</span>{t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── RIGHT ── floating chips over the hero image */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:1.1, delay:0.3 }}
            className="hidden lg:block"
            style={{ position:'relative', height:'100vh' }}
          >
            <style>{`
              @keyframes float-a { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
              @keyframes float-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
              @keyframes float-c { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
              @keyframes shield-pulse { 0%,100%{box-shadow:0 0 20px ${GOLD}44} 50%{box-shadow:0 0 40px ${GOLD}88} }
            `}</style>

            {/* Floating label chips */}
            {[
              { label:'Verified Specialists', top:'18%', left:'52%', anim:'float-a', delay:'0s' },
              { label:'Safe Facilities',      top:'28%', left:'78%', anim:'float-b', delay:'0.6s' },
              { label:'Recovery Care',        top:'52%', left:'38%', anim:'float-c', delay:'1.1s' },
              { label:'Travel Coordination',  top:'52%', left:'74%', anim:'float-a', delay:'0.4s' },
              { label:'24/7 Support',         top:'72%', left:'44%', anim:'float-b', delay:'0.9s' },
              { label:'Risk Intelligence',    top:'72%', left:'74%', anim:'float-c', delay:'0.2s' },
            ].map(({ label, top, left, anim, delay }) => (
              <div key={label} style={{
                position:'absolute', top, left,
                animation:`${anim} 4s ease-in-out infinite`, animationDelay: delay,
                background:'rgba(5,10,22,0.78)',
                border:`1px solid ${GOLD}50`,
                backdropFilter:'blur(12px)',
                borderRadius:999, padding:'7px 14px',
                fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.9)',
                whiteSpace:'nowrap', letterSpacing:'0.04em',
                boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
                display:'flex', alignItems:'center', gap:6,
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: GOLD, flexShrink:0, boxShadow:`0 0 6px ${GOLD}` }} />
                {label}
              </div>
            ))}

            {/* SAFE-T shield badge */}
            <div style={{
              position:'absolute', top:'38%', left:'52%',
              animation:'shield-pulse 3s ease-in-out infinite',
              background:'rgba(5,10,22,0.88)',
              border:`1.5px solid ${GOLD}66`,
              borderRadius:16, padding:'10px 16px',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              backdropFilter:'blur(16px)',
            }}>
              <svg viewBox="0 0 44 50" fill="none" style={{ width:34, height:38 }}>
                <path d="M22 2L40 10V28C40 38 33 44 22 48C11 44 4 38 4 28V10L22 2Z"
                  fill={`${GOLD}18`} stroke={GOLD} strokeWidth="1.2" />
                <path d="M18 18H26V23H31V31H26V36H18V31H13V23H18V18Z"
                  fill="white" opacity="0.92" />
              </svg>
              <p style={{ color: GOLD, fontSize:8.5, fontWeight:800, letterSpacing:'0.2em', textTransform:'uppercase' }}>SAFE-T4LIFE™</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:6.5, letterSpacing:'0.14em', textTransform:'uppercase' }}>Safety Intelligence</p>
            </div>
          </motion.div>
        </div>
      </section>

      <HowItWorksModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}