import React from 'react';

const GOLD = '#D4AF37';

const metrics = [
  { stars: true, value: '4.9/5', label: 'From 1,200+ reviews' },
  { value: '1,200+', label: 'Care journeys completed' },
  { value: '35+', label: 'Countries served' },
  { value: '98%', label: 'Patient satisfaction' },
];

const logos = ['Google', '★ Trustpilot', 'RealSelf'];

export default function LuxuryTrustBar() {
  return (
    <section
      style={{
        background: '#080E1A',
        borderTop: `1px solid ${GOLD}1E`,
        borderBottom: `1px solid ${GOLD}1E`,
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-7 flex flex-col lg:flex-row items-center gap-6 lg:gap-0">

        {/* Left label */}
        <div className="lg:pr-10 lg:border-r border-white/10 shrink-0 text-center lg:text-left">
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/35">
            Trusted By Patients Worldwide
          </p>
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-8 lg:gap-0 flex-1 justify-center lg:justify-around lg:px-10">
          {metrics.map(({ stars, value, label }, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                {stars && (
                  <p className="text-sm mb-0.5" style={{ color: GOLD }}>★★★★★</p>
                )}
                <p className="text-white font-bold text-xl lg:text-2xl tracking-tight">{value}</p>
                <p className="text-white/35 text-xs">{label}</p>
              </div>
              {i < metrics.length - 1 && (
                <div className="hidden lg:block w-px h-8 bg-white/10" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Social proof logos */}
        <div className="lg:pl-10 lg:border-l border-white/10 flex items-center gap-6 shrink-0">
          {logos.map(logo => (
            <span key={logo} className="text-white/30 text-sm font-medium tracking-wide hover:text-white/50 transition-colors">
              {logo}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}