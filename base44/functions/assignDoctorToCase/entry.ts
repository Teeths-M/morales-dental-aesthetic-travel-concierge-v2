import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BRAND = 'Morales Dental & Aesthetics';
const TEAM = 'Morales Concierge Team';

const PROCEDURE_LABELS = {
  dental_implants: 'Dental Implants',
  all_on_4: 'All-on-4 / All-on-6',
  porcelain_veneers: 'Porcelain Veneers',
  smile_makeover: 'Smile Makeover',
  bone_regeneration: 'Bone Regeneration',
  teeth_whitening: 'Teeth Whitening & Cosmetic Dentistry',
  rhinoplasty: 'Rhinoplasty (Nose Reshaping)',
  breast_surgery: 'Breast Augmentation / Reduction / Lift',
  liposuction: 'Liposuction',
  tummy_tuck: 'Abdominoplasty (Tummy Tuck)',
  facelift: 'Facelift',
  brow_lift: 'Brow Lift',
  blepharoplasty: 'Eyelid Surgery (Blepharoplasty)',
  otoplasty: 'Otoplasty (Ear Reshaping)',
  thigh_arm_lift: 'Thigh Lift / Arm Lift',
  laser_resurfacing: 'Skin Rejuvenation (Laser Resurfacing)',
  mole_removal: 'Mole Removal (Skin Nevus)',
  lipoma_removal: 'Lipoma Removal',
  gastric_sleeve: 'Gastric Sleeve (Sleeve Gastrectomy)',
  gastric_bypass: 'Gastric Bypass (Roux-en-Y)',
  gastric_band_revision: 'Gastric Band Removal / Revision',
  gynecological_exams: 'Gynecological Diagnostic Exams',
  ivf: 'IVF (In Vitro Fertilization)',
  egg_freezing: 'Fertility Preservation (Egg Freezing)',
  oncology_surgery: 'Oncological Surgical Procedures',
  tumor_testing: 'Tumor Marker & Blood Panel Testing',
  joint_replacement: 'Joint Replacement (Hip & Knee)',
  spine_surgery: 'Spine Surgery',
  sports_arthroscopy: 'Sports Injuries & Arthroscopy',
  fracture_surgery: 'Fracture Management & Trauma Surgery',
  other: 'General Medical Consultation',
};

const formatProcedure = (raw) => {
  if (!raw) return 'Not specified';
  if (Array.isArray(raw)) {
    return raw.map(p => {
      const normalized = String(p).toLowerCase().replace(/\s+/g, '_');
      return PROCEDURE_LABELS[normalized] || p.replace(/_/g, ' ');
    }).join(', ');
  }
  const normalized = String(raw).toLowerCase().replace(/\s+/g, '_');
  return PROCEDURE_LABELS[normalized] || raw.replace(/_/g, ' ');
};

const escapeHtml = (v) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function generateSecureToken(prefix, caseId) {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${caseId}_${hex}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId, doctorId } = await req.json();
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

    // BUG-R7-01 FIX: All entity reads/writes must use asServiceRole in admin functions.
    // Patient CaseRecords and Doctor records are owned by non-admin users. The user-scoped
    // base44.entities client only returns records owned by the calling admin, so every
    // CaseRecord.get() and Doctor.filter() returned 404 / [] for real patient data.
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    if (caseRecord.safe_t_result !== 'PASSED') {
      return Response.json({
        error: 'Cannot assign doctor - SAFE-T review not passed',
        safe_t_result: caseRecord.safe_t_result
      }, { status: 400 });
    }

    let selectedDoctor = null;
    if (!doctorId) {
      // Try country-matched doctors first, fall back to any active
      let doctors = await base44.asServiceRole.entities.Doctor.filter({
        clinic_country: caseRecord.procedure_country,
        status: 'active'
      });
      if (doctors.length === 0) {
        doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' });
      }
      if (doctors.length === 0) {
        await base44.asServiceRole.entities.CaseRecord.update(caseId, {
          status: 'Admin-Review',
          admin_notes: 'No available doctor found — manual assignment required',
          timeline_log: [...(caseRecord.timeline_log || []), {
            timestamp: new Date().toISOString(),
            action: 'auto_assign_failed',
            details: 'No available doctor found — manual assignment required'
          }]
        });
        return Response.json({ status: 'NO_DOCTOR_AVAILABLE', message: 'No available doctor found. Case flagged for manual review.' });
      }
      selectedDoctor = doctors[0];
    } else {
      selectedDoctor = await base44.asServiceRole.entities.Doctor.get(doctorId);
    }

    // SECURITY: status='active' is necessary but not sufficient.
    // Enforce full credential verification before assigning a doctor to a patient.
    const ASSIGNMENT_VERIFIED = new Set(['verified', 'auto_verified', 'manually_approved']);
    if (!selectedDoctor) {
      return Response.json({ error: 'Doctor not found' }, { status: 400 });
    }
    if (selectedDoctor.status !== 'active') {
      return Response.json({ error: 'Doctor account is not active' }, { status: 400 });
    }
    if (!selectedDoctor.license_verified) {
      return Response.json({ error: 'Doctor license has not been verified — patient assignment blocked for safety' }, { status: 400 });
    }
    if (!ASSIGNMENT_VERIFIED.has(selectedDoctor.verification_status)) {
      return Response.json({
        error: `Doctor verification is incomplete (status: ${selectedDoctor.verification_status ?? 'unset'}). Full credential approval required before patient assignment.`,
      }, { status: 400 });
    }

    // Also fetch linked consultation for additional procedure context
    let consultation = null;
    if (caseRecord.consultation_id) {
      try {
        consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id);
      } catch (_) {}
    }

    const procedureDisplay = formatProcedure(consultation?.procedure_interest || caseRecord.procedures);
    const portalToken = await generateSecureToken('doc', caseId);
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const portalUrl = `${appUrl}/portal/doctor/${portalToken}`;

    // Stale check: re-fetch fresh state before updating to avoid concurrent edit race
    const freshCases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId }, '-created_date', 1);
    const freshCase = freshCases?.[0];
    if (!freshCase) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }
    const expectedStatus = caseRecord.status;
    if (freshCase.status !== expectedStatus) {
      return Response.json({
        error: `Case status has changed (expected ${expectedStatus}, got ${freshCase.status}). Please refresh and try again.`,
        stale: true,
      }, { status: 409 });
    }

    // Valid status transitions — prevent invalid state jumps
    const VALID_TRANSITIONS: Record<string, string[]> = {
      'Submitted':        ['Doctor-Pending', 'Cancelled'],
      'Doctor-Pending':   ['Doctor-Confirmed', 'Doctor-Declined', 'Cancelled'],
      'Doctor-Confirmed': ['Deposit-Paid', 'Cancelled'],
      'Deposit-Paid':     ['PMP-25', 'In-Progress', 'Cancelled'],
      'PMP-25':           ['In-Progress', 'Cancelled'],
      'In-Progress':      ['Completed', 'Cancelled'],
      'Completed':        [], // Terminal — no transitions allowed
      'Cancelled':        [], // Terminal
    };

    const targetStatus = 'Doctor-Pending';
    const allowedNext = VALID_TRANSITIONS[freshCase.status] || [];
    if (!allowedNext.includes(targetStatus)) {
      console.error(`[assignDoctorToCase] Invalid transition: ${freshCase.status} → ${targetStatus}`);
      return Response.json({
        error: `Cannot assign doctor: case is in ${freshCase.status} status`,
        current_status: freshCase.status,
      }, { status: 409 });
    }

    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      status: 'Doctor-Pending',
      doctor_email: selectedDoctor.email,
      doctor_portal_token: portalToken,
      doctor_selected: selectedDoctor.full_name,
      clinic_selected: selectedDoctor.clinic_name || 'Clinic',
      doctor_notified_at: new Date().toISOString(),
    });

    const preferredDate = consultation?.preferred_date
      ? new Date(consultation.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'To be confirmed';

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: selectedDoctor.email,
      subject: `New Patient Ready for Scheduling — ${caseRecord.client_name} | ${BRAND}`,
      body: `<!doctype html>
<html>
<body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#13221d;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
        <tr><td style="background:#29483d;padding:28px 32px;color:#ffffff;">
          <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:-0.3px;">${escapeHtml(BRAND)}</div>
          <div style="margin-top:8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">DOCTOR REQUEST</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#13221d;font-weight:400;">New patient ready for scheduling</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#40514a;">A patient has passed the SAFE-T review and is ready for clinical availability confirmation.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:22px 0;">
            <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(caseRecord.client_name)}</td></tr>
            <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(procedureDisplay)}</td></tr>
            <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Preferred date</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(preferredDate)}</td></tr>
            <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Risk level</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(caseRecord.risk_score || 'Low')}</td></tr>
            <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Notes</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(consultation?.notes || 'None')}</td></tr>
          </table>
          <a href="${escapeHtml(portalUrl)}" style="display:inline-block;margin-top:6px;background:#29483d;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;">Review in portal</a>
          <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#64746d;">Please confirm availability through the portal or by replying to this email.</p>
          <p style="margin:18px 0 0;font-size:14px;color:#13221d;font-weight:700;">${TEAM}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    });

    return Response.json({
      status: 'DOCTOR_ASSIGNED',
      doctor_email: selectedDoctor.email,
      doctor_name: selectedDoctor.full_name,
      portal_url: portalUrl,
      procedure_display: procedureDisplay,
      message: 'Doctor assigned and notified successfully'
    });

  } catch (error) {
    console.error('[assignDoctorToCase]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});