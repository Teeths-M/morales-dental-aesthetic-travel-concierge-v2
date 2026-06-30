import React from 'react';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly (name, contact details, medical history relevant to your procedure, passport and travel documents) and information generated while you use the platform (location data during active trips, device data, communication logs with your concierge team).',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your information is used to coordinate your medical travel — booking procedures, arranging travel logistics, monitoring your safety during your trip, and communicating with your care team. We do not sell your personal or medical data.',
  },
  {
    title: 'Data Security',
    body: 'Sensitive documents (passports, medical records) are encrypted at rest. Emergency PIN access uses industry-standard key derivation. Access to your data is role-restricted and logged.',
  },
  {
    title: 'Data Sharing',
    body: 'We share the minimum necessary information with verified partners directly involved in your care — your doctor, travel agency, companion, or security escort — solely to deliver the services you have booked.',
  },
  {
    title: 'Your Rights',
    body: 'You may request a copy of your data, request corrections, or request deletion (subject to medical record retention requirements) by contacting us at info@moralesconcierge.com.',
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060B16] via-[#0A101D] to-[#060B16]">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] mb-4" style={{ color: '#D4AF37' }}>
          Legal
        </p>
        <h1 className="font-display text-3xl lg:text-4xl text-white mb-3">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-10">
          Draft — pending final legal counsel review. Last updated June 2026.
        </p>

        <div className="space-y-8">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="text-lg font-semibold text-white mb-2">{s.title}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/30 mt-12 pt-6 border-t border-white/10">
          Questions about this policy? Contact us at{' '}
          <a href="mailto:info@moralesconcierge.com" className="text-white/50 underline">info@moralesconcierge.com</a>.
        </p>
      </div>
    </div>
  );
}
