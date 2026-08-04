// @ts-nocheck — Deno types not in VS Code LSP (pre-existing config gap, not a real error)
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

// VPN / Tor / datacenter IP prefix heuristics — expand as threat intelligence updates
const TOR_VPN_PREFIXES   = ['185.220.', '185.130.', '185.164.', '194.165.', '45.142.', '45.143.', '198.96.', '23.129.'];
const DATACENTER_PREFIXES = ['104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.',
  '172.67.', '172.68.', '172.70.', '35.', '34.', '52.', '54.', '40.', '20.', '13.'];

function normalizePhone(p: string): string {
  return (p || '').replace(/\D/g, '').slice(-10);
}

function scoreIP(ip: string): { suspicious: boolean; datacenter: boolean; label: string } {
  if (!ip) return { suspicious: false, datacenter: false, label: 'unknown' };
  if (TOR_VPN_PREFIXES.some(x => ip.startsWith(x)))   return { suspicious: true,  datacenter: false, label: 'vpn_or_tor' };
  if (DATACENTER_PREFIXES.some(x => ip.startsWith(x))) return { suspicious: false, datacenter: true,  label: 'datacenter' };
  return { suspicious: false, datacenter: false, label: 'residential' };
}

function computeScore(s: {
  sharedPhone: number; sharedAddress: number; sharedDevice: number;
  ipSuspicious: boolean; ipDatacenter: boolean;
  livenessStatus: string; internetScore: number;
  vpnOnlyException?: boolean;
}): { score: number; flags: string[]; positives: string[] } {
  let score = 0;
  const flags: string[] = [];
  const positives: string[] = [];

  // Device fingerprint cross-match
  if (s.sharedDevice >= 3) {
    score += 45; flags.push(`Device fingerprint shared with ${s.sharedDevice} other applications — fraud factory pattern`);
  } else if (s.sharedDevice >= 1) {
    score += 22; flags.push(`Device fingerprint matches ${s.sharedDevice} prior application(s) — possible shared device`);
  } else {
    positives.push('Device fingerprint unique — no cross-application reuse detected');
  }

  // Phone number cross-match
  if (s.sharedPhone >= 4) {
    score += 40; flags.push(`Phone linked to ${s.sharedPhone} other accounts — confirmed fraud cluster`);
  } else if (s.sharedPhone >= 1) {
    score += 18; flags.push(`Phone number on ${s.sharedPhone} other application(s) — verify sole ownership`);
  } else {
    positives.push('Phone number unique across all platform records');
  }

  // Address cross-match
  if (s.sharedAddress >= 5) {
    score += 35; flags.push(`Address associated with ${s.sharedAddress} other profiles — known fraud cluster indicator`);
  } else if (s.sharedAddress >= 2) {
    score += 12; flags.push(`Address shared with ${s.sharedAddress} other profiles — verify legitimacy`);
  }

  // IP intelligence
  if (s.ipSuspicious) {
    if (s.vpnOnlyException) {
      // VPN with zero shared infrastructure + confirmed liveness = professional security policy, not fraud.
      // Downgrade from +25 to +8 so a security-conscious surgeon isn't auto-blocked.
      score += 8; flags.push('Professional VPN detected — exception rule applied (clean network + liveness confirmed). Flag for admin awareness only.');
    } else {
      score += 25; flags.push('Signup IP masked by VPN or Tor — identity obfuscation attempt');
    }
  } else if (s.ipDatacenter) {
    score += 8; flags.push('Signup from datacenter proxy — unusual for individual practitioner');
  } else {
    positives.push('IP resolves to residential / commercial ISP — consistent with practitioner location');
  }

  // Biometric liveness
  if (s.livenessStatus === 'failed') {
    score += 30; flags.push('Biometric liveness check failed — static image or deepfake suspected');
  } else if (s.livenessStatus === 'pending') {
    score += 12; flags.push('Biometric liveness verification not yet completed');
  } else if (s.livenessStatus === 'passed') {
    score -= 10; positives.push('Biometric liveness confirmed — applicant physically present during signup');
  }

  // Carry internet intelligence score as a correlating signal
  if (s.internetScore > 55) {
    score += 12;
  } else if (s.internetScore < 25) {
    score -= 5; positives.push('Internet Intelligence scan confirms low-risk digital footprint');
  }

  return { score: Math.max(0, Math.min(100, score)), flags, positives };
}

function riskLevel(score: number): 'low' | 'medium' | 'high' {
  return score < 25 ? 'low' : score < 55 ? 'medium' : 'high';
}

function buildXAI(score: number, flags: string[], positives: string[]): string {
  const confidence = 100 - score;
  if (score < 25) {
    return `High confidence (${confidence}/100) this application is legitimate. ${positives.length} corroborating signal(s) support activation with no manual review required.`;
  }
  if (score < 55) {
    return `Moderate confidence (${confidence}/100). ${flags.length} signal(s) warrant admin review before activation. Not conclusive of fraud — insufficient to auto-clear without human verification.`;
  }
  return `Low confidence (${confidence}/100). ${flags.length} high-risk signal(s) detected. Application held for mandatory admin review. DO NOT activate without full manual verification of each flag.`;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    doctor_id,
    phone             = '',
    clinic_address    = '',
    signup_ip         = '',
    device_fp_hash    = '',
    liveness_status   = 'pending',
    existing_internet_score = 50,
  } = await body();

  if (!doctor_id) return err('doctor_id is required');

  // Admins can run this on any doctor. A just-signed-up doctor (not yet an
  // admin) may trigger it only on their own record — the one moment it needs
  // to fire without human involvement — never on anyone else's.
  const isAdmin = user && ['admin', 'platform_admin'].includes(user.role);
  if (!isAdmin) {
    const [ownRecord] = await base44.asServiceRole.entities.Doctor.filter({ id: doctor_id }).catch(() => []);
    if (!ownRecord || ownRecord.email !== user?.email) return err('Forbidden', 403);
  }

  // Cross-database network detection — query all doctors and compare
  const allDoctors = await base44.asServiceRole.entities.Doctor.filter({});
  const others = allDoctors.filter((d: Record<string, string>) => d.id !== doctor_id);

  const normPhone = normalizePhone(phone);
  const sharedPhone = normPhone.length >= 7
    ? others.filter((d: Record<string, string>) => normalizePhone(d.phone || '') === normPhone).length
    : 0;

  const sharedDevice = device_fp_hash
    ? others.filter((d: Record<string, string>) => d.device_fp_hash === device_fp_hash).length
    : 0;

  const normAddr = (clinic_address || '').toLowerCase().replace(/\s+/g, '');
  const sharedAddress = normAddr.length > 6
    ? others.filter((d: Record<string, string>) => {
        const b = (d.clinic_address || '').toLowerCase().replace(/\s+/g, '');
        return b.length > 5 && b.includes(normAddr.slice(0, 8));
      }).length
    : 0;

  const ipIntel = scoreIP(signup_ip);

  // VPN-only exception: a practitioner with zero shared infrastructure and confirmed liveness
  // who uses a VPN is more likely enforcing a corporate security policy than hiding fraud.
  const vpnOnlyException = (
    ipIntel.suspicious &&
    sharedDevice === 0 &&
    sharedPhone === 0 &&
    sharedAddress === 0 &&
    liveness_status === 'passed'
  );

  const { score, flags, positives } = computeScore({
    sharedPhone, sharedAddress, sharedDevice,
    ipSuspicious: ipIntel.suspicious,
    ipDatacenter: ipIntel.datacenter,
    livenessStatus: liveness_status,
    internetScore: existing_internet_score,
    vpnOnlyException,
  });

  const level = riskLevel(score);
  const xai_summary = buildXAI(score, flags, positives);

  const signals = {
    network: { shared_phone: sharedPhone, shared_address: sharedAddress, shared_device: sharedDevice },
    ip:      { label: ipIntel.label, address: signup_ip || 'unknown' },
    identity:{ liveness_status },
    device:  { fp_hash: device_fp_hash || null, reuse_count: sharedDevice },
  };

  // Persist results to Doctor entity
  try {
    await base44.asServiceRole.entities.Doctor.update(doctor_id, {
      fraud_risk_level:    level,
      fraud_risk_score:    score,
      fraud_xai_summary:   xai_summary,
      fraud_xai_flags:     flags,
      fraud_xai_positives: positives,
      fraud_signals:       signals,
      fraud_last_checked:  new Date().toISOString(),
      ...(device_fp_hash ? { device_fp_hash } : {}),
      ...(signup_ip      ? { signup_ip }      : {}),
    });
  } catch (_) {}

  // Audit log for high-risk detections
  if (level === 'high') {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type:  'fraud_intelligence_high_risk',
      resource_type: 'doctor',
      resource_id: doctor_id,
      actor_id:    'system',
      actor_role:  'system',
      actor_name:  'FraudIntelligence Engine',
      details:     { score, level, flags, signals },
      sensitive:   true,
      timestamp:   new Date().toISOString(),
      prev_hash:   await computePrevHash(base44),
    });
  }

  return ok({
    fraud_risk_level: level,
    fraud_risk_score: score,
    xai_confidence:   100 - score,
    xai_summary,
    xai_flags:        flags,
    xai_positives:    positives,
    signals,
  });
}, { name: 'runFraudIntelligence', requireAuth: true }));
