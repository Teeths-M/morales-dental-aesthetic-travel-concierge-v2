import React from 'react';
import { Search, Shield, LayoutGrid, Check, Phone, Volume2, Moon, Maximize2, X, ArrowRight, ShieldCheck } from 'lucide-react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';

/**
 * MSafeDemo — the landing page's product demonstration, drawn as the M-Safe
 * workspace itself: cream ground, gold rules, the agent's identity on the
 * left, and one provider-verification session on the right.
 *
 * Everything here is illustrative and labelled as such below the panel. It is
 * a picture of the product, not a live session, so it holds no patient data
 * and calls nothing.
 */

const C = {
  ground: '#F5F2ED',
  sidebar: '#F8F5F0',
  card: '#FFFFFF',
  border: '#E4DCCB',
  gold: '#C5A059',
  goldInk: '#B08A3E',
  ink: '#2D2A26',
  soft: '#6B6560',
  faint: '#8C8C87',
  greenBg: '#D1E7DD',
  greenInk: '#0F5132',
  greenBorder: '#B7D9C6',
  greyBg: '#ECE9E2',
  greyInk: '#55504A',
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
};

const CAPABILITIES = [
  { label: 'Analyze', Icon: Search },
  { label: 'Protect', Icon: Shield },
  { label: 'Coordinate', Icon: LayoutGrid },
  { label: 'Resolve', Icon: Check },
];

const BUBBLE = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '13px 15px',
  boxShadow: '0 1px 2px rgba(45,42,38,0.05), 0 6px 16px rgba(45,42,38,0.04)',
  color: C.ink,
  fontSize: 13,
  lineHeight: 1.62,
  margin: 0,
};

function TaskPill({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: C.greenBg,
        border: `1px solid ${C.greenBorder}`,
        color: C.greenInk,
        borderRadius: 9999,
        padding: '4px 10px',
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: C.sans,
      }}
    >
      {label} <Check className="w-3 h-3" strokeWidth={3} />
    </span>
  );
}

function DoctorCard({ name, badge, badgeTone, note }) {
  const tone = badgeTone === 'green'
    ? { background: C.greenBg, color: C.greenInk, border: `1px solid ${C.greenBorder}` }
    : { background: C.greyBg, color: C.greyInk, border: `1px solid #DCD7CC` };

  return (
    <div style={BUBBLE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{name}</span>
        <span
          style={{
            ...tone,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 9999,
            padding: '2px 9px',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {badgeTone === 'green' && <ShieldCheck className="w-3 h-3" />}
          {badge}
        </span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11.5, color: C.soft, lineHeight: 1.6 }}>{note}</p>
    </div>
  );
}

export default function MSafeDemo() {
  return (
    <div
      className="msd-shell"
      style={{
        background: C.ground,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        overflow: 'hidden',
        fontFamily: C.sans,
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      }}
    >
      {/* ── Sidebar ── */}
      <aside className="msd-sidebar" style={{ background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
        <p style={{ margin: 0, fontFamily: C.serif, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
          M-Safe<span style={{ color: C.gold }}>+</span>
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>
          Morales Super Agent
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, color: C.soft, lineHeight: 1.5 }}>
          Medical + Travel Concierge
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 14px' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `1px solid ${C.border}`,
              background: 'radial-gradient(circle at 50% 35%, #FFFFFF 0%, #EFEADF 70%, #E3DCCB 100%)',
              boxShadow: `inset 0 0 0 1px ${C.border}`,
            }}
          >
            <RobotAvatarImage size={96} animated={false} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 9999,
            padding: '7px 12px',
            marginBottom: 14,
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: '50%', border: `1.5px solid ${C.faint}`, display: 'inline-block' }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.ink }}>Monitoring</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CAPABILITIES.map(({ label, Icon }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '9px 8px',
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: C.gold }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3CB371', display: 'inline-block' }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.faint }}>LIVE SESSION</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="msd-main">
        <div
          className="msd-header"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: C.card }}
        >
          <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
            <RobotAvatarImage size={26} animated={false} />
          </div>
          <p className="msd-title" style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            M-Safe
            <span style={{ color: C.faint, fontWeight: 400 }}> · </span>
            <span style={{ color: C.soft, fontWeight: 500 }}>Morales Super Agent</span>
          </p>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: C.greenBg,
                border: `1px solid ${C.greenBorder}`,
                color: C.greenInk,
                borderRadius: 9999,
                padding: '3px 9px',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1F7A4D' }} />
              LIVE SESSION
            </span>
            <span className="msd-icons" style={{ display: 'flex', alignItems: 'center', gap: 9, color: C.faint }}>
              <Phone className="w-3.5 h-3.5" />
              <Volume2 className="w-3.5 h-3.5" />
              <Moon className="w-3.5 h-3.5" />
              <Maximize2 className="w-3.5 h-3.5" />
              <X className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="msd-body">
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: C.goldInk, textTransform: 'uppercase' }}>
            Real scenario · Provider verification
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <TaskPill label="discoverProviderCandidates" />
            <TaskPill label="verifyDiscoveredCandidate" />
          </div>

          <div className="msd-thread">
            <p style={BUBBLE}>
              Morning. I checked both surgeons against the registers they are licensed with — not against
              anything they told us about themselves.
            </p>

            <DoctorCard
              name="Dr. Elena Ruiz Castellón"
              badge="Verified"
              badgeTone="green"
              note="Secretaría de Salud (SEP), Mexico · Checked today"
            />

            <DoctorCard
              name="Dr. Marco Fuentes Leal"
              badge="Could Not Be Verified Here"
              badgeTone="grey"
              note="No electronic registry available for this credential yet — flagged for care-team review, not marked failed."
            />

            <div style={BUBBLE}>
              <p style={{ margin: 0 }}>
                So to be precise about what that badge means: a primary source confirmed the credential
                today. It is a statement about evidence, not a score, and not a promise about the surgery.
                Where I cannot reach a register, I say so rather than quietly marking the surgeon failed.
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: C.soft, lineHeight: 1.6 }}>
                Pilot note: licence verification covers the electronic registries reachable today — not
                every country publishes one.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 14px',
            borderTop: `1px solid ${C.border}`,
            background: C.card,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: `1px solid ${C.border}`,
              borderRadius: 9999,
              padding: '9px 14px',
              fontSize: 12.5,
              color: C.faint,
              background: C.sidebar,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Ask M-Safe anything…
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4B978, #BE9A45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(190,154,69,0.35)',
            }}
          >
            <ArrowRight className="w-4 h-4" style={{ color: '#FFFFFF' }} />
          </div>
        </div>
      </div>

      <style>{`
        .msd-shell { display: grid; grid-template-columns: 232px 1fr; align-items: stretch; min-height: 520px; }
        .msd-sidebar { display: flex; flex-direction: column; padding: 20px 16px; }
        .msd-main { display: flex; flex-direction: column; min-width: 0; background: #FFFFFF; }
        .msd-body { flex: 1; min-height: 0; padding: 16px 18px 20px; display: flex; flex-direction: column; }
        .msd-thread { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }

        @media (max-width: 860px) {
          .msd-shell { grid-template-columns: 1fr; min-height: 0; }
          .msd-sidebar { display: none; }
          .msd-icons { display: none !important; }
        }
        @media (max-width: 520px) {
          .msd-title { font-size: 11.5px; }
          .msd-body { padding: 14px 13px 16px; }
        }
      `}</style>
    </div>
  );
}