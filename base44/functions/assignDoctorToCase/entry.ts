import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
  // Handle array (Case.procedures) or single string (Consultation.procedure_interest)
  if (Array.isArray(raw)) {
    return raw.map(p => PROCEDURE_LABELS[p] || p.replace(/_/g, ' ')).join(', ');
  }
  return PROCEDURE_LABELS[raw] || raw.replace(/_/g, ' ');
};

const escapeHtml = (v) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId, doctorId } = await req.json();
    
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });
    if (!doctorId) return Response.json({ error: 'Doctor ID required' }, { status: 400 });

    const caseRecord = await base44.entities.Case.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    if (caseRecord.safe_t_result !== 'PASSED') {
      return Response.json({ 
        error: 'Cannot assign doctor - SAFE-T review not passed',
        safe_t_result: caseRecord.safe_t_result 
      }, { status: 400 });
    }

    const selectedDoctor = await base44.entities.Doctor.get(doctorId);
    if (!selectedDoctor || selectedDoctor.status !== 'active') {
      return Response.json({ error: 'Selected doctor not found or inactive' }, { status: 400 });
    }

    // Also fetch linked consultation for additional procedure context
    let consultation = null;
    if (caseRecord.consultation_id) {
      try {
        consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id);
      } catch (_) {}
    }

    // Resolve procedure name: prefer consultation.procedure_interest over Case.procedures
    const procedureDisplay = formatProcedure(
      consultation?.procedure_interest || caseRecord.procedures
    );

    const portalToken = `doc_${caseId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const portalUrl = `${appUrl}/portal/doctor/${portalToken}`;

    await base44.entities.Case.update(caseId, {
      status: 'Doctor-Pending',
      doctor_email: selectedDoctor.email,
      doctor_portal_token: portalToken,
      doctor_selected: selectedDoctor.full_name,
      clinic_selected: selectedDoctor.clinic_name || 'Clinic'
    });

    const preferredDate = consultation?.preferred_date
      ? new Date(consultation.preferred_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'To be confirmed';

    await base44.integrations.Core.SendEmail({
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
            <tr>
              <td style="padding:10px 0;color:#64746d;font-size:13px;width:38%;">Patient</td>
              <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(caseRecord.client_name)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure</td>
              <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(procedureDisplay)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64746d;font-size:13px;">Preferred date</td>
              <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(preferredDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64746d;font-size:13px;">Risk level</td>
              <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(caseRecord.risk_score || 'Low')}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64746d;font-size:13px;">Notes</td>
              <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${escapeHtml(consultation?.notes || 'None')}</td>
            </tr>
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});