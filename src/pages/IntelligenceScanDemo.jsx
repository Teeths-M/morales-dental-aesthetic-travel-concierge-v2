// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Globe, Fingerprint, Network, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IntelligenceScanCard from '@/components/admin/IntelligenceScanCard';

const SCAN_STEPS = [
  { key: 'domain',   label: 'Domain Intelligence',     desc: 'Checking domain age & registration history' },
  { key: 'social',   label: 'Social Media Presence',   desc: 'Verifying profiles across all platforms' },
  { key: 'phone',    label: 'Phone Analysis',           desc: 'Analyzing number origin and carrier signals' },
  { key: 'network',  label: 'Fraud Network Detection',  desc: 'Cross-referencing against known fraud clusters' },
  { key: 'device',   label: 'Device Fingerprinting',   desc: 'Analyzing device signature and IP intelligence' },
  { key: 'liveness', label: 'Liveness Verification',   desc: 'Biometric binding and identity proofing' },
  { key: 'xai',      label: 'XAI Confidence Score',    desc: 'Explainable AI composite risk assessment' },
];

const DOCTORS = [
  {
    id: 'sofia', full_name: 'Dr. Sofia Ramirez', clinic_name: 'Clínica Dental Riviera',
    clinic_city: 'Cancún', clinic_country: 'Mexico', specialty: 'Cosmetic Dentistry & Implants',
    initials: 'SR', avatarColor: '#10b981', delay: 0,
    result: {
      risk_level: 'low', risk_score: 18,
      summary: 'Dr. Sofia Ramirez presents a strong and verifiable digital footprint. The clinic domain registered in 2016 demonstrates an 8-year operational history — highly consistent with a claimed established practice. Active presence across Facebook, Instagram, and TikTok with consistent patient engagement confirms authentic practice activity. The phone number resolves to a registered Mexican landline associated with the clinic address in Cancún. Cross-referencing public web sources returned multiple independent patient testimonials on Google Maps and Yelp, plus two local media features.',
      ai_positive_indicators: [
        'Domain age 8+ years confirms long-standing established practice (registered 2016)',
        'All 3 social platforms verified live with active monthly patient engagement',
        'Phone resolves to verified clinic landline — not a mobile or VoIP number',
        'Multiple independent patient reviews found across Google Maps and Yelp',
      ],
      ai_red_flags: [],
      signals: { social_checks: [{ platform: 'Facebook', status: 'active' }, { platform: 'Instagram', status: 'active' }, { platform: 'TikTok', status: 'active' }] },
      google: { status: 'verified', rating: 4.9, review_count: 127, snippet: '"Best dental work of my life. Flew in from Texas and would do it again without hesitation." — Sarah M., Houston TX' },
    },
    fraud_result: {
      fraud_risk_score: 8, xai_confidence: 92,
      xai_summary: 'High confidence (92/100) this application is legitimate. Unique device from residential San Diego ISP — consistent with a US-based coordinator managing a Mexican clinic. Zero shared infrastructure across any database record. Biometric liveness confirmed in 3.2 seconds.',
      xai_flags: [],
      xai_positives: [
        'Device fingerprint unique — no cross-application reuse detected',
        'Phone number unique across all platform records',
        'IP resolves to residential Comcast ISP, San Diego CA',
        'Biometric liveness confirmed — applicant physically present',
      ],
      signals: {
        network:  { shared_phone: 0, shared_address: 0, shared_device: 0 },
        ip:       { label: 'residential', country: 'US', city: 'San Diego, CA' },
        identity: { liveness_status: 'passed', detail: 'Blink + left/right head turn detected in 3.2s' },
        device:   { type: 'MacBook Pro M2', browser: 'Safari 17', timezone: 'America/Los_Angeles', reuse_count: 0, fp_label: 'Unique' },
      },
    },
  },
  {
    id: 'marcus', full_name: 'Dr. Marcus Chen', clinic_name: 'Centro Médico Internacional',
    clinic_city: 'Bogotá', clinic_country: 'Colombia', specialty: 'Oral & Maxillofacial Surgery',
    initials: 'MC', avatarColor: '#f59e0b', delay: 900,
    result: {
      risk_level: 'medium', risk_score: 41,
      summary: 'Dr. Marcus Chen has a partial digital footprint that warrants admin review. The clinic domain was registered 2 years ago — relatively recent for a claimed 10-year practice history. Facebook presence is confirmed active; however, Instagram could not be verified and no TikTok was provided. The phone resolves as a mobile device rather than a clinic line. Fewer than 5 independent third-party mentions of the clinic were found.',
      ai_positive_indicators: [
        'Facebook page verified active with regular posts and patient interaction',
        'Phone carrier confirmed as a registered Colombian mobile network (Claro CO)',
      ],
      ai_red_flags: [
        'Domain age 2 years is inconsistent with claimed 10+ years of practice experience',
        'Fewer than 5 independent web mentions of the clinic detected across all sources',
        'Instagram handle not found or account inactive',
      ],
      signals: { social_checks: [{ platform: 'Facebook', status: 'active' }, { platform: 'Instagram', status: 'not_found' }, { platform: 'TikTok', status: 'not_provided' }] },
      google: { status: 'unverified', rating: 3.6, review_count: 9, snippet: '"Good results but the clinic is hard to find and phone rarely answered." — Carlos R., Bogotá' },
    },
    fraud_result: {
      fraud_risk_score: 38, xai_confidence: 62,
      xai_summary: 'Moderate confidence (62/100). 3 signals warrant admin review. Device timezone (America/New_York) conflicts with claimed Bogotá practice — possible for a US-trained physician abroad, but requires confirmation. Signup routed through Cloudflare datacenter proxy. Address prefix matches 1 prior submission.',
      xai_flags: [
        'Device timezone (America/New_York) inconsistent with Bogotá practice location claim',
        'Signup IP resolved to Cloudflare datacenter proxy — unusual for individual practitioner',
        'Clinic address prefix matches 1 prior application submitted 3 months ago',
      ],
      xai_positives: [
        'Device fingerprint unique — no cross-application reuse detected',
        'Phone number unique across all platform records',
      ],
      signals: {
        network:  { shared_phone: 0, shared_address: 1, shared_device: 0 },
        ip:       { label: 'datacenter', country: 'CO', city: 'Bogotá' },
        identity: { liveness_status: 'step_up_required', detail: 'Document notarization triggered — step-up verification in progress' },
        device:   { type: 'Windows 11 PC', browser: 'Chrome 124', timezone: 'America/New_York', reuse_count: 0, fp_label: 'Timezone mismatch flagged' },
      },
    },
  },
  {
    id: 'amara', full_name: 'Dr. Amara Osei', clinic_name: 'International Maxillofacial Partners',
    clinic_city: 'Dubai / London', clinic_country: 'Roaming', specialty: 'Oral & Maxillofacial Surgery',
    initials: 'AO', avatarColor: '#D4AF37', delay: 2700,
    result: {
      risk_level: 'low', risk_score: 29,
      summary: 'Dr. Amara Osei is a credentialed traveling maxillofacial surgeon operating across Gulf and European hospital networks. No fixed brick-and-mortar clinic — she holds active operating privileges at 6 affiliated hospitals. Her WHO International Registry entry (MED-2019-AO) is publicly verifiable. LinkedIn shows 4,200+ professional connections, 3 peer-reviewed publications indexed on PubMed, and 8 institutional co-author affiliations. Facebook and Instagram confirmed active. No Google Business listing is expected for her practice model — she operates exclusively through hospital booking systems. 8 completed surgical cases on this platform with zero complaints.',
      ai_positive_indicators: [
        'WHO International Registry — verified surgical credential MED-2019-AO',
        '3 peer-reviewed publications indexed on PubMed — confirmed academic standing',
        'LinkedIn verified active: 4,200+ connections across surgical networks',
        '8 previously completed cases on this platform — zero adverse events or complaints',
        'Active hospital privileges at 6 institutions across UAE, UK, and Ghana',
      ],
      ai_red_flags: [],
      signals: { social_checks: [{ platform: 'Facebook', status: 'active' }, { platform: 'Instagram', status: 'active' }, { platform: 'TikTok', status: 'not_provided' }] },
      google: { status: 'not_found', rating: null, review_count: 0, snippet: null },
    },
    fraud_result: {
      fraud_risk_score: 18, xai_confidence: 82,
      xai_summary: 'High confidence (82/100). VPN-only exception rule applied — all network cross-checks are clean and liveness passed. A professional VPN from a credentialed surgeon with 8 completed platform cases and WHO-verified credentials is institutional security policy, not fraud infrastructure. Admin fast-tracked on review.',
      xai_flags: [
        'Professional VPN detected — exception rule applied (clean network + liveness confirmed). Flag for admin awareness only.',
      ],
      xai_positives: [
        'Device fingerprint unique — no cross-application reuse detected',
        'Phone number unique across all platform records',
        'IP residential-tier VPN: downgraded from +25 to +8 (VPN-only exception — zero shared infrastructure)',
        'Biometric liveness confirmed — applicant physically present during signup',
        'Internet Intelligence confirms 8 prior successful cases on platform — known trusted partner',
      ],
      signals: {
        network:  { shared_phone: 0, shared_address: 0, shared_device: 0 },
        ip:       { label: 'vpn_or_tor', country: 'AE', city: 'Dubai, UAE (via VPN)' },
        identity: { liveness_status: 'passed', detail: 'Blink + right head turn detected in 4.1s — step-up completed' },
        device:   { type: 'MacBook Pro M3', browser: 'Safari 17.4', timezone: 'Asia/Dubai', reuse_count: 0, fp_label: 'Unique' },
      },
      fast_track: {
        status: 'cleared',
        cleared_by: 'Admin — Portia M.',
        cleared_at: '3 min after scan',
        reason: 'WHO credential MED-2019-AO verified. VPN use confirmed as hospital network security policy. 8 prior completed cases with zero incidents. Traveling Surgeon Protocol applied — no further review required.',
      },
    },
  },
  {
    id: 'emmanuel', full_name: 'Dr. Emmanuel Okafor', clinic_name: 'Lagos Smile Center',
    clinic_city: 'Lagos', clinic_country: 'Nigeria', specialty: 'General Dentistry',
    initials: 'EO', avatarColor: '#ef4444', delay: 1800,
    result: {
      risk_level: 'high', risk_score: 78,
      summary: "Dr. Emmanuel Okafor's digital profile presents significant verification concerns across every signal layer. No registered domain was found for 'Lagos Smile Center'. All three social media platforms returned zero results. The provided phone resolves to a VoIP service — a pattern strongly associated with synthetic identities used in medical credential fraud. AI web intelligence found zero independent corroboration of this clinic or practitioner.",
      ai_positive_indicators: [],
      ai_red_flags: [
        'No domain registration found for claimed clinic name — zero web presence',
        'All 3 social media handles returned zero results on every platform',
        'Phone number resolves to VoIP service — strongly associated with fraud patterns',
        'Zero independent web mentions of clinic or practitioner across all sources',
      ],
      signals: { social_checks: [{ platform: 'Facebook', status: 'not_found' }, { platform: 'Instagram', status: 'not_found' }, { platform: 'TikTok', status: 'not_found' }] },
      google: { status: 'not_found', rating: null, review_count: 0, snippet: null },
    },
    fraud_result: {
      fraud_risk_score: 94, xai_confidence: 6,
      xai_summary: 'Low confidence (6/100). 7 high-risk signals detected. FRAUD FACTORY: device fingerprint b3f71a matches 3 suspended applications. Phone on 4 accounts in 180 days. Address on 6 rejections. Tor exit node with impossible travel. Headless browser. Liveness bypass attempted. DO NOT ACTIVATE.',
      xai_flags: [
        'Device fingerprint linked to 3 previously suspended applications — fraud factory confirmed',
        'Phone number associated with 4 other accounts in 180 days — confirmed fraud cluster',
        'Clinic address matches 6 prior rejected applications — known fraud cluster address',
        'Signup IP is a Tor exit node — full identity obfuscation attempt',
        'Impossible travel: device active in Accra, then London, then Lagos within 90 minutes',
        'Headless Chrome browser signature detected — automated signup bot',
        'Biometric liveness failed — static image submitted, deepfake suspected',
      ],
      xai_positives: [],
      signals: {
        network:  { shared_phone: 4, shared_address: 6, shared_device: 3 },
        ip:       { label: 'vpn_or_tor', country: '??', city: 'Unknown (Tor exit node)' },
        identity: { liveness_status: 'failed', detail: 'Static image detected — liveness bypass attempted' },
        device:   { type: 'Unknown / Headless', browser: 'Headless Chrome (bot)', timezone: 'UTC+0 (no local offset)', reuse_count: 3, fp_label: 'FRAUD FACTORY' },
      },
      device_network: {
        device_id: 'b3f71a',
        entries: [
          { clinic: 'Clinica Bella',      date: 'Nov 2024', current: false },
          { clinic: 'Centro Estetico',    date: 'Jan 2025', current: false },
          { clinic: 'Lagos Smile Center', date: 'NOW',      current: true  },
        ],
      },
    },
  },
];

export default function IntelligenceScanDemo() {
  const [runKey,  setRunKey]  = useState(0);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    setAllDone(false);
    // Last doctor (Amara) starts at 2700ms, 7 steps × 700ms = 4900ms, +600ms buffer
    const t = setTimeout(() => setAllDone(true), 2700 + SCAN_STEPS.length * 700 + 600);
    return () => clearTimeout(t);
  }, [runKey]);

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>
      {/* Page header */}
      <div className="border-b border-border" style={{ background: '#0C1A1D' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Globe className="w-5 h-5" style={{ color: '#D4AF37' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: '#64748b' }}>SAFE-T 4LIFE™ · LIVE SYSTEM DEMO</p>
                  <h1 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>Defense-in-Depth Intelligence Engine</h1>
                </div>
              </div>
              <p className="text-sm max-w-xl leading-relaxed" style={{ color: '#94a3b8' }}>
                Every doctor application triggers a 7-layer scan combining Internet Intelligence,
                Fraud Network Detection, Device Fingerprinting, and Biometric Liveness — automatically,
                the moment they submit. No admin clicks required.
              </p>
            </div>
            <Button onClick={() => setRunKey(k => k + 1)} variant="outline" size="sm"
              className="gap-2 flex-shrink-0" disabled={!allDone}
              style={{ color: '#f1f5f9', borderColor: '#2A3F4A' }}>
              <RefreshCw className="w-3.5 h-3.5" />
              Replay Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Applications Processed',  value: '4', color: '#f1f5f9' },
              { label: 'Approved / Fast-Track',   value: '2', color: '#10b981' },
              { label: 'Under Review',            value: '1', color: '#f59e0b' },
              { label: 'Fraud Network Flagged',   value: '1', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="p-3.5 rounded-xl" style={{ background: '#060B16', border: '1px solid #2A3F4A' }}>
                <p className="text-[10px] font-medium leading-tight" style={{ color: '#64748b' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* 4-pillar legend */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { Icon: Globe,        label: 'Internet Intelligence', desc: 'Domain · Social · Phone · Google' },
              { Icon: Network,      label: 'Fraud Network',         desc: 'Cross-DB phone · address · device hash' },
              { Icon: Fingerprint,  label: 'Device & IP',           desc: 'Browser fingerprint · IP geofencing' },
              { Icon: ScanFace,     label: 'Liveness + XAI',        desc: 'Biometrics · Explainable confidence score' },
            ].map(p => (
              <div key={p.label} className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <p.Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
                <div>
                  <p className="text-[10px] font-bold" style={{ color: '#f1f5f9' }}>{p.label}</p>
                  <p className="text-[9px]" style={{ color: '#64748b' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scan cards */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {DOCTORS.map(doc => (
            <IntelligenceScanCard key={doc.id + runKey} doctor={doc} scanSteps={SCAN_STEPS} runKey={runKey} />
          ))}
        </div>

        {/* Architecture callout */}
        <div className="mt-8 p-6 rounded-2xl" style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>Defense-in-Depth architecture — how it works</p>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                Seven automated layers fire the moment a doctor submits. Layers 1–3 check domain age via RDAP,
                verify social handles with live HTTP probes, and detect VoIP phone numbers.
                Layer 4 cross-references every submitted phone number, clinic address, and device fingerprint
                against all prior applications — detecting fraud factories in real time by spotting shared infrastructure.
                Layer 5 analyzes IP intelligence: VPN and Tor masking, datacenter proxies, and impossible travel patterns
                across device sessions. Layer 6 requires a random live biometric gesture to confirm physical presence
                and prevent static-image or deepfake bypass. Layer 7 synthesizes every signal into an Explainable AI
                confidence score — with a plain-English verdict and per-signal reasoning so your admin reviewer knows
                exactly why a profile was flagged, not just that it was.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
