import React from 'react';

const SECTIONS = [
  {
    title: 'Services Provided',
    body: 'Morales Dental & Aesthetic Travel Concierge coordinates medical travel logistics — provider matching, travel arrangements, companion and security services, and recovery monitoring. We are a concierge and logistics coordinator; medical care itself is provided by independently licensed doctors and facilities.',
  },
  {
    title: 'Booking & Payment',
    body: 'Consultation fees are charged at booking and credited toward your treatment package if you proceed. Package pricing, deposits, and refund terms are confirmed in writing before any procedure is scheduled.',
  },
  {
    title: 'Patient Responsibilities',
    body: 'You are responsible for providing accurate medical history, valid travel documents, and timely communication with your care and concierge team. Failure to disclose relevant medical information may affect treatment safety and is your responsibility.',
  },
  {
    title: 'Safety & Monitoring Services',
    body: 'Safe-T4life, MedGuard, and related monitoring features are provided as a safety aid and do not replace your own judgment, local emergency services, or your treating physician\'s advice.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Morales Dental & Aesthetic Travel Concierge is not liable for the clinical outcomes of procedures performed by independent third-party providers. Our liability is limited to the concierge and coordination services we directly provide.',
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060B16] via-[#0A101D] to-[#060B16]">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] mb-4" style={{ color: '#D4AF37' }}>
          Legal
        </p>
        <h1 className="font-display text-3xl lg:text-4xl text-white mb-3">Terms of Service</h1>
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
          Questions about these terms? Contact us at{' '}
          <a href="mailto:info@moralesconcierge.com" className="text-white/50 underline">info@moralesconcierge.com</a>.
        </p>
      </div>
    </div>
  );
}
