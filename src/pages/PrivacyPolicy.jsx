import React from 'react';
import { SUBPROCESSORS, DATA_CONSENT_VERSION } from '@/components/consent/DataProcessingConsent';

// Prose sections. The subprocessor list and the international-transfer note are
// rendered separately below so the "who we share with" promise the consent
// screen makes is backed by a concrete, matching list on this page.
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
    body: 'Sensitive documents (passports, medical records) are encrypted at rest. Emergency PIN access uses industry-standard key derivation. Access to your data is role-restricted and logged, and every access to a sensitive record is written to a tamper-evident audit trail.',
  },
];

// Rendered after the subprocessor list.
const CLOSING_SECTIONS = [
  {
    title: 'Your Rights & Choices',
    body: 'You may request a copy of your data, request corrections, or request deletion (subject to medical record retention requirements) by contacting us. Where you have given consent to process your information, you may withdraw it at any time — though some coordination services cannot continue without the information they depend on.',
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
          Draft — pending final legal counsel review. Last updated July 2026 · Consent version {DATA_CONSENT_VERSION}.
        </p>

        <div className="space-y-8">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="text-lg font-semibold text-white mb-2">{s.title}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
            </div>
          ))}

          {/* Concrete subprocessor list — the same one shown on the consent screen. */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Service Providers We Share Data With</h2>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              To deliver your care we share the minimum information necessary with the trusted service
              providers below. We share only what each one needs, and never for advertising or resale.
            </p>
            <ul className="space-y-2.5">
              {SUBPROCESSORS.map(s => (
                <li
                  key={s.name}
                  className="flex gap-3 text-sm text-white/60 leading-relaxed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span aria-hidden="true" style={{ color: '#D4AF37' }} className="flex-shrink-0">•</span>
                  <span>
                    <span className="font-semibold text-white">{s.name}</span> — {s.purpose}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Honest international-transfer disclosure — data is not yet region-pinned. */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">International Data Transfers</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Because our providers and our own team operate across borders, your information may be
              stored or processed in a country other than the one you live in. Wherever it goes, the
              same protections in this policy apply. We are actively working toward regional data
              residency so your information can be kept closer to home.
            </p>
          </div>

          {CLOSING_SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="text-lg font-semibold text-white mb-2">{s.title}</h2>
              <p className="text-sm text-white/60 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/30 mt-12 pt-6 border-t border-white/10">
          Questions about this policy, or want to exercise your data rights? Contact us at{' '}
          <a href="mailto:info@moralesconcierge.com" className="text-white/50 underline">info@moralesconcierge.com</a>.
        </p>
      </div>
    </div>
  );
}
