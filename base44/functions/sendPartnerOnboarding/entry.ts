import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

function doctorEmailBody(doctor) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Public Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a4731,#2d6a4f);padding:40px;text-align:center;">
            <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;letter-spacing:-0.5px;">Welcome to SAFE-T 4LIFE™</h1>
            <p style="color:#a8d5b9;margin:8px 0 0;font-size:14px;">Your Partner Onboarding Guide</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">Hello <strong>${doctor.full_name || 'Doctor'}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
              Thank you for registering with the <strong>SAFE-T 4LIFE™</strong> Medical Tourism Platform. Your application has been received and is now in our verification queue. Here is everything you need to complete your onboarding.
            </p>

            <!-- Step 1 -->
            <table width="100%" style="background:#f0faf4;border-radius:12px;padding:20px;margin-bottom:16px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1a4731;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">1</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1a4731;margin:0 0 4px;">Upload Your Medical License</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">Log into your doctor dashboard and upload a clear scan of your current medical license. Accepted formats: PDF, PNG, JPG.</p>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" style="background:#f0faf4;border-radius:12px;padding:20px;margin-bottom:16px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1a4731;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">2</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1a4731;margin:0 0 4px;">Complete Identity Verification</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">A Stripe Identity verification link will be sent to your email within 24 hours. This is a one-time step required for all active partners.</p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" style="background:#f0faf4;border-radius:12px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1a4731;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">3</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1a4731;margin:0 0 4px;">Set Up Your Procedure Pricing</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">From your dashboard, configure your procedure pricing and availability. This allows us to match you with patients immediately upon verification.</p>
                </td>
              </tr>
            </table>

            <!-- Verification Requirements Box -->
            <table width="100%" style="background:#fff8e1;border:1px solid #f9c74f;border-radius:12px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#7c5c00;margin:0 0 8px;">📋 Verification Requirements Checklist</p>
                  <ul style="font-size:13px;color:#555;margin:0;padding-left:18px;line-height:2;">
                    <li>Valid medical license (not expired)</li>
                    <li>Government-issued photo ID</li>
                    <li>Proof of clinic/practice address</li>
                    <li>Professional credential certificates (if applicable)</li>
                    <li>Malpractice insurance documentation</li>
                  </ul>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/doctor-dashboard" style="display:inline-block;background:linear-gradient(135deg,#1a4731,#2d6a4f);color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    Go to My Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#888;margin:24px 0 0;text-align:center;line-height:1.6;">
              Questions? Reply to this email or contact us at <a href="mailto:partners@safe-t4life.com" style="color:#1a4731;">partners@safe-t4life.com</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f6f3;padding:20px;text-align:center;">
            <p style="font-size:11px;color:#aaa;margin:0;">SAFE-T 4LIFE™ Medical Tourism Platform · Confidential Partner Communication</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function securityAgencyEmailBody(agency) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Public Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#334155);padding:40px;text-align:center;">
            <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;letter-spacing:-0.5px;">Welcome to SAFE-T 4LIFE™</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Security Agency Partner Onboarding</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">Hello <strong>${agency.contact_person || agency.agency_name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
              Thank you for registering <strong>${agency.agency_name}</strong> with the SAFE-T 4LIFE™ platform. Your agency application is now under review. Please follow the steps below to complete your onboarding as quickly as possible.
            </p>

            <!-- Step 1 -->
            <table width="100%" style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:16px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1e293b;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">1</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 4px;">Submit Operational License & Insurance</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">Upload your government-issued security operations license and current liability insurance certificate via your agency dashboard.</p>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:16px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1e293b;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">2</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 4px;">KYP (Know Your Partner) Screening</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">Our compliance team will initiate a KYP screening including sanctions check and document forensics. This typically takes 2–5 business days.</p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#1e293b;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:700;font-size:14px;">3</div>
                </td>
                <td style="padding-left:14px;">
                  <p style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 4px;">Enable SOS Response Availability</p>
                  <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">Once verified, configure your response availability and operational regions in the agency dashboard to start receiving SOS dispatch alerts.</p>
                </td>
              </tr>
            </table>

            <!-- Verification Requirements Box -->
            <table width="100%" style="background:#fef3f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-size:13px;font-weight:700;color:#991b1b;margin:0 0 8px;">🛡️ Verification Requirements Checklist</p>
                  <ul style="font-size:13px;color:#555;margin:0;padding-left:18px;line-height:2;">
                    <li>Valid security operations license (government-issued)</li>
                    <li>Liability insurance certificate (current year)</li>
                    <li>Business registration certificate</li>
                    <li>Contact person government-issued ID</li>
                    <li>List of certified personnel (redacted names acceptable)</li>
                    <li>Vehicle registration (if armored fleet is offered)</li>
                  </ul>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/security-agency-dashboard" style="display:inline-block;background:linear-gradient(135deg,#1e293b,#334155);color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    Go to Agency Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#888;margin:24px 0 0;text-align:center;line-height:1.6;">
              Questions? Reply to this email or contact us at <a href="mailto:partners@safe-t4life.com" style="color:#1e293b;">partners@safe-t4life.com</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f6f3;padding:20px;text-align:center;">
            <p style="font-size:11px;color:#aaa;margin:0;">SAFE-T 4LIFE™ Medical Tourism Platform · Confidential Partner Communication</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { partner_type, entity_id } = await req.json();

    if (!partner_type || !entity_id) {
      return Response.json({ error: 'partner_type and entity_id are required' }, { status: 400 });
    }

    let partner, subject, html;

    if (partner_type === 'doctor') {
      // BUG-R13-03 FIX: filter({ id }) always returns [] — use .get()
      partner = await base44.asServiceRole.entities.Doctor.get(entity_id);
      if (!partner) return Response.json({ error: 'Doctor not found' }, { status: 404 });
      subject = 'Welcome to SAFE-T 4LIFE™ — Your Doctor Onboarding Guide';
      html = doctorEmailBody(partner);
    } else if (partner_type === 'security_agency') {
      // BUG-R13-03 FIX: filter({ id }) always returns [] — use .get()
      partner = await base44.asServiceRole.entities.SecurityAgency.get(entity_id);
      if (!partner) return Response.json({ error: 'Security agency not found' }, { status: 404 });
      subject = 'Welcome to SAFE-T 4LIFE™ — Security Agency Onboarding Guide';
      html = securityAgencyEmailBody(partner);
    } else {
      return Response.json({ error: 'Invalid partner_type. Use "doctor" or "security_agency"' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: partner.email,
      from_name: 'SAFE-T 4LIFE™ Partner Team',
      subject,
      body: html,
    });

    return Response.json({ success: true, sent_to: partner.email, partner_type });
  } catch (error) {
    // BUG-R13-02 FIX: SEC-10
    console.error('[sendPartnerOnboarding]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});