import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #eef2f4',
      boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#0f3b3c', textDecoration: 'none', letterSpacing: '-0.5px' }}>
          MORALES
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }} className="desktop-nav">
          {[['Home', '/'], ['Treatments', '/procedures'], ['How It Works', '/how-it-works'], ['Safety', '/safe-t'], ['Concierge', '/discover'], ['About Us', '/about']].map(([label, to]) => (
            <Link key={label} to={to} style={{ textDecoration: 'none', color: '#2c4c4d', fontWeight: 500, fontSize: '0.95rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#1a7f7a'}
              onMouseLeave={e => e.target.style.color = '#2c4c4d'}
            >{label}</Link>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontWeight: 500, color: '#2c4c4d', fontSize: '0.9rem' }}>EN</span>
          <Link to="/dashboard" style={outlineBtn}>Client Login</Link>
          <Link to="/booking" style={primaryBtn}>Book Consultation</Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 32px 56px', textAlign: 'center' }}>
      <p style={{ fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#1a7f7a', fontWeight: 600, marginBottom: 16 }}>
        DENTAL &amp; AESTHETIC TRAVEL CONCIERGE
      </p>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#0f3b3c', maxWidth: 800, margin: '0 auto 20px', lineHeight: 1.2 }}>
        WORLD-CLASS CARE.<br />PERSONALIZED FOR YOU.
      </h1>

      {/* Badges */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', margin: '24px 0 36px' }}>
        {['Verified Specialists', 'Premium Medical Travel.', 'Verified. Safe. Seamless.'].map(b => (
          <span key={b} style={{ background: '#f0f6f5', padding: '6px 20px', borderRadius: 40, fontSize: '0.85rem', fontWeight: 500, color: '#0f3b3c' }}>{b}</span>
        ))}
      </div>

      {/* 3 feature cols */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', margin: '0 0 36px', textAlign: 'left' }}>
        {[['24/7 Support', 'Always available when you need us.'], ['Verified Specialists', 'Only top-tier, accredited professionals.'], ['Safe Facilities', 'Rigorous safety standards at every location.']].map(([title, text]) => (
          <div key={title} style={{ maxWidth: 220 }}>
            <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', marginBottom: 8, color: '#0f3b3c' }}>{title}</h4>
            <p style={{ fontSize: '0.9rem', color: '#4a5b5e' }}>{text}</p>
          </div>
        ))}
      </div>

      <p style={{ maxWidth: 720, margin: '0 auto 24px', fontSize: '1.05rem', color: '#2c4c4d', lineHeight: 1.7 }}>
        Morales coordinates every step of your dental or aesthetic care journey – from consultation to recovery. You focus on yourself. We handle the rest.
      </p>

      <div style={{ display: 'inline-block', background: '#eae5d9', padding: '7px 22px', borderRadius: 40, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px', margin: '0 0 28px' }}>
        SAFE-T4LIFE™ &nbsp;|&nbsp; SAFETY INTELLIGENCE ENGINE
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Link to="/booking" style={{ ...primaryBtn, padding: '14px 38px', fontSize: '1rem' }}>Book Your Consultation →</Link>
        <Link to="/how-it-works" style={{ ...outlineBtn, padding: '14px 38px', fontSize: '1rem' }}>How It Works</Link>
      </div>
    </div>
  );
}

// ─── Value Props (8 cards) ────────────────────────────────────────────────────
const cards = [
  ['Risk Intelligence', 'Data-driven risk assessment'],
  ['Travel Coordination', 'Seamless logistics'],
  ['Verified Specialists', 'Rigorous vetting'],
  ['Transparent Pricing', 'No hidden fees'],
  ['End-to-End Concierge', 'We handle everything'],
  ['Recovery Support', "Until you're home"],
  ['Recovery Care', 'Personalized aftercare'],
  ['World-class experts', 'Global leaders in care'],
];

function ValueProps() {
  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={sectionTitle}>What We Provide</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, margin: '40px 0 24px' }}>
          {cards.map(([title, text]) => (
            <ServiceCard key={title} title={title} text={text} />
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#1a7f7a', fontWeight: 500, letterSpacing: '0.5px' }}>
          No hidden fees &nbsp;•&nbsp; We handle everything &nbsp;•&nbsp; Until you're home
        </p>
      </div>
    </section>
  );
}

function ServiceCard({ title, text }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#fff' : '#fafcfc',
        padding: '24px 20px', borderRadius: 24,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.07)' : '0 4px 12px rgba(0,0,0,0.03)',
        border: '1px solid #eef2f4',
        textAlign: 'center',
        transform: hovered ? 'translateY(-5px)' : 'none',
        transition: 'all 0.22s ease',
        cursor: 'default',
      }}
    >
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', marginBottom: 10, color: '#0f3b3c' }}>{title}</h3>
      <p style={{ color: '#5b7a7a', fontSize: '0.88rem' }}>{text}</p>
    </div>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────
function Trust() {
  return (
    <section style={{ ...sectionStyle, background: '#f8faf9' }}>
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        <h2 style={{ ...sectionTitle, letterSpacing: '2px', fontSize: '1.6rem' }}>TRUSTED BY PATIENTS WORLDWIDE</h2>
        <div style={{ fontSize: '2rem', color: '#f5b042', letterSpacing: 4, margin: '16px 0 8px' }}>★★★★★ <span style={{ color: '#0f3b3c', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 700 }}>4.9/5</span></div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 40, margin: '36px 0 28px' }}>
          {[['1,200+', 'From 1,200+ reviews'], ['1,200+', 'Care journeys completed'], ['35+', 'Countries served'], ['98%', 'Patient satisfaction']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f3b3c' }}>{val}</div>
              <div style={{ color: '#5b7a7a', fontSize: '0.88rem', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <span style={{ background: '#00b67a', color: '#fff', fontWeight: 700, fontSize: '0.8rem', padding: '4px 12px', borderRadius: 4 }}>★ Trustpilot</span>
          <span style={{ color: '#1a7f7a', fontWeight: 500, fontSize: '0.9rem' }}>4.9 • Excellent</span>
        </div>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '1.2rem', color: '#7f9e9e', marginTop: 16 }}>yourself.</p>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
const steps = [
  ['01', 'Consultation', 'Share your goals. We listen and guide you with expert advice.'],
  ['02', 'Specialist Matching', 'We connect you with carefully vetted specialists.'],
  ['03', 'Travel & Stay', 'Flights, accommodation and transport. All arranged for you.'],
  ['04', 'Recovery & Return', "Personalized recovery support until you're safely back home."],
];

function HowItWorks() {
  return (
    <section style={sectionStyle}>
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        <h2 style={sectionTitle}>HOW IT WORKS</h2>
        <p style={{ color: '#5b7a7a', fontSize: '1.05rem', marginBottom: 40 }}>Your Journey, Simplified</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, margin: '0 0 32px' }}>
          {steps.map(([num, title, desc]) => (
            <div key={num} style={{ flex: '1 1 200px', maxWidth: 260, background: '#fafcfc', padding: '28px 20px', borderRadius: 28, textAlign: 'center', border: '1px solid #eef2f4' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 800, color: '#cbdcdb', marginBottom: 12 }}>{num}</div>
              <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', marginBottom: 10, color: '#0f3b3c' }}>{title}</h4>
              <p style={{ color: '#5b7a7a', fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
        <Link to="/how-it-works" style={{ ...outlineBtn, padding: '12px 32px', fontSize: '0.95rem' }}>Explore the Process →</Link>
      </div>
    </section>
  );
}

// ─── Why Morales ──────────────────────────────────────────────────────────────
const whyItems = [
  ['Human Concierge', 'Real people guiding you. Every step of the way.'],
  ['Safe Connections', 'Only vetted specialists and accredited facilities.'],
  ['Better Outcomes', 'Personalized care plans for optimal results.'],
  ['Stress-Free Experience', 'You focus on you. We manage the details.'],
];

function WhyMorales() {
  return (
    <section style={{ ...sectionStyle, borderBottom: 'none' }}>
      <div style={containerStyle}>
        <h2 style={sectionTitle}>More Than Travel. It's Peace of Mind.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, marginTop: 32 }}>
          {whyItems.map(([title, desc]) => (
            <div key={title} style={{ textAlign: 'center', padding: '20px 16px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', marginBottom: 10, color: '#0f3b3c' }}>{title}</h3>
              <p style={{ color: '#5b7a7a', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#f0f5f4', padding: '40px 32px', textAlign: 'center', color: '#5b7a7a', fontSize: '0.85rem', borderTop: '1px solid #eef2f4' }}>
      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: '1.4rem', color: '#0f3b3c', marginBottom: 12 }}>MORALES</p>
      <p>© {new Date().getFullYear()} Morales — Dental & Aesthetic Travel Concierge. All rights reserved.</p>
      <p style={{ marginTop: 10 }}>✉️ care@moralescare.com &nbsp;|&nbsp; 📞 +1 (888) 123-4567</p>
    </footer>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a7f7a', color: '#fff', border: 'none',
  padding: '10px 22px', borderRadius: 40, fontWeight: 600,
  fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none',
  transition: 'background 0.2s, transform 0.2s',
};
const outlineBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#1a7f7a',
  border: '1.5px solid #1a7f7a',
  padding: '10px 22px', borderRadius: 40, fontWeight: 600,
  fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none',
  transition: 'background 0.2s',
};
const sectionStyle = {
  padding: '72px 0',
  borderBottom: '1px solid #eef2f4',
  background: '#fff',
};
const containerStyle = {
  maxWidth: 1280, margin: '0 auto', padding: '0 32px',
};
const sectionTitle = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '2.2rem', fontWeight: 600,
  color: '#0f3b3c', textAlign: 'center', marginBottom: 12,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#fff', color: '#1a2a3a', lineHeight: 1.5 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
      <Navbar />
      <Hero />
      <ValueProps />
      <Trust />
      <HowItWorks />
      <WhyMorales />
      <Footer />
    </div>
  );
}