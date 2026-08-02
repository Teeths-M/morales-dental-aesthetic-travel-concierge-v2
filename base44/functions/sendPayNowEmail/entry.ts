import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const e   = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function payNowEmail({ clientName, procedures, destination, caseRef,
  packageFull, packageTerms, firstInstall, payFullUrl, payTermsUrl }: {
  clientName: string; procedures: string; destination: string; caseRef: string;
  packageFull: number; packageTerms: number; firstInstall: number;
  payFullUrl: string; payTermsUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:40px 32px 28px;text-align:center;">
  <img src="${APP_URL}/morales-m-mark.png" width="60" alt="M" style="display:block;margin:0 auto 16px;filter:drop-shadow(0 0 16px rgba(212,175,55,0.7));" />
  <div style="width:160px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:0 auto 16px;"></div>
  <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;">Your Package is Ready</div>
  <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-weight:400;color:#fff;line-height:1.2;">
    ${e(clientName)}, your journey awaits.
  </h1>
  <p style="margin:14px 0 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
    All partners have confirmed. Your personalised care package is ready to book.
  </p>
</td></tr>

<tr><td style="padding:0 24px 24px;">
  <!-- Package summary -->
  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:16px;padding:20px;margin-bottom:20px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;">Package Summary</div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:45%;">Patient</td><td style="padding:6px 0;color:#fff;font-size:14px;font-weight:700;">${e(clientName)}</td></tr>
      <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Procedure(s)</td><td style="padding:6px 0;color:#fff;font-size:13px;">${e(procedures)}</td></tr>
      <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Destination</td><td style="padding:6px 0;color:#fff;font-size:13px;">${e(destination)}</td></tr>
      <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Case Reference</td><td style="padding:6px 0;color:${GOLD};font-size:13px;font-weight:700;">${e(caseRef)}</td></tr>
    </table>
    <div style="border-top:1px solid #2A3F4A;margin-top:14px;padding-top:14px;">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">What's included</div>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;">
        ✓ Doctor and clinical procedure<br/>
        ✓ Round-trip flights<br/>
        ✓ Hotel accommodation (procedure + recovery)<br/>
        ✓ All local transfers (airport, clinic, hotel)<br/>
        ✓ Recovery companion service<br/>
        ✓ 24/7 Morales concierge support
      </p>
    </div>
  </div>

  <!-- Payment options -->
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:16px;">Choose Your Payment Plan</div>

  <!-- Option 1: Pay in Full -->
  <div style="background:#0C1A1D;border:2px solid ${GOLD};border-radius:16px;padding:20px;margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
      <div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${GOLD};">Option 1 — Pay in Full</div>
        <div style="font-size:28px;font-weight:700;color:#fff;margin-top:6px;">${usd(packageFull)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px;">One payment. Best value. 25% platform markup.</div>
      </div>
      <div style="background:${GOLD}20;border:1px solid ${GOLD}40;border-radius:8px;padding:4px 10px;white-space:nowrap;">
        <span style="font-size:11px;color:${GOLD};font-weight:700;">BEST PRICE</span>
      </div>
    </div>
    <a href="${e(payFullUrl)}" style="display:block;text-align:center;background:${GOLD};color:#060B16;text-decoration:none;padding:13px;border-radius:999px;font-size:14px;font-weight:700;">
      Pay ${usd(packageFull)} — In Full →
    </a>
  </div>

  <!-- Option 2: 50% Now -->
  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:16px;padding:20px;margin-bottom:24px;">
    <div style="margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#60a5fa;">Option 2 — Pay 50% Now</div>
      <div style="font-size:28px;font-weight:700;color:#fff;margin-top:6px;">${usd(firstInstall)} <span style="font-size:14px;color:rgba(255,255,255,0.4);font-weight:400;">today</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px;">
        Then ${usd(firstInstall)} balance · Total: ${usd(packageTerms)} · 30% markup applies.
      </div>
    </div>
    <a href="${e(payTermsUrl)}" style="display:block;text-align:center;background:#1e3a5f;color:#60a5fa;text-decoration:none;padding:13px;border-radius:999px;font-size:14px;font-weight:700;border:1px solid #2563eb;">
      Pay ${usd(firstInstall)} — 50% Deposit →
    </a>
  </div>

  <p style="margin:0 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
    Payment links expire in 48 hours. This quote is valid for 7 days.<br/>
    Questions? Contact your concierge on WhatsApp anytime.
  </p>
  <p style="margin:16px 0 0;font-size:14px;color:#fff;font-weight:700;text-align:center;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, internal_secret } = await body();

  // SECURITY: had zero auth — anyone with a case_id could re-trigger this
  // real payment-request email at a real patient repeatedly. Reads its own
  // display data from CaseRecord, so no injection — this closes the
  // spam/annoyance vector.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!case_id) return err('case_id is required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);
  if (!c.package_price_full) return err('Package price not yet calculated — run calculatePackagePrice first');

  const caseRef    = case_id.slice(-8).toUpperCase();
  const procedures = (c.procedures || []).join(', ') || 'Your procedure(s)';

  // Payment URLs — route to PaymentCheckout which reads case_id from URL params
  const payFullUrl  = `${APP_URL}/portal-hub/checkout/${case_id}?type=full`;
  const payTermsUrl = `${APP_URL}/portal-hub/checkout/${case_id}?type=terms`;

  await Promise.allSettled([
    base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: c.client_email,
      subject: `Your Morales package is ready — choose your payment | ${BRAND}`,
      body: payNowEmail({
        clientName:   c.client_name,
        procedures,
        destination:  c.procedure_country || 'Your destination',
        caseRef,
        packageFull:  c.package_price_full,
        packageTerms: c.package_price_terms,
        firstInstall: c.package_price_first_installment,
        payFullUrl,
        payTermsUrl,
      }),
    }),
    base44.asServiceRole.entities.CaseRecord.update(case_id, {
      pay_now_email_sent_at: new Date().toISOString(),
    }),
    base44.asServiceRole.entities.AuditLog.create({
      event_type: 'pay_now_email_sent', actor_id: 'system', actor_role: 'system',
      actor_name: 'Morales Automation', resource_type: 'CaseRecord', resource_id: case_id,
      case_id, sensitive: false, timestamp: new Date().toISOString(),
      details: { sent_to: c.client_email, full: c.package_price_full, terms: c.package_price_terms },
    }),
  ]);

  return ok({ sent_to: c.client_email, package_price_full: c.package_price_full, package_price_terms: c.package_price_terms });
}, { name: 'sendPayNowEmail', requireAuth: false, allowedRoles: [] }));
