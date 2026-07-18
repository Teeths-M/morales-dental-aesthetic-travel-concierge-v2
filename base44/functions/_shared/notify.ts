// ── Canonical link-only outbound email ──────────────────────────────────────
// M is the vault: only a teaser + a secure portal link ever leaves the platform —
// never PHI, pricing, addresses, amounts, or patient identity. All real content is
// read in-portal after login. Every migrated sender uses this one template so the
// "nothing private leaves M" foundation is enforced in one place.
//
// NOTE: `title` and `line` MUST be generic (no names, no numbers, no addresses).

const BRAND = 'Morales Medical Travel Safety';
const GOLD = '#D4AF37';

const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface LinkOnlyEmailOpts {
  title: string;      // generic headline, no PHI
  line: string;       // generic body line, no PHI
  ctaUrl: string;     // secure portal deep-link
  ctaLabel?: string;
  brand?: string;
}

export function linkOnlyEmail(o: LinkOnlyEmailOpts): string {
  const brand = o.brand || BRAND;
  const label = o.ctaLabel || 'Open My Portal';
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:18px;overflow:hidden;">
<tr><td style="padding:26px 30px;">
  <div style="font-size:24px;font-weight:900;color:${GOLD};margin-bottom:4px;">M</div>
  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:16px;">${esc(brand)}</div>
  <p style="font-size:15px;color:#fff;margin:0 0 10px;font-weight:700;">${esc(o.title)}</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;line-height:1.6;">${esc(o.line)}</p>
  <a href="${esc(o.ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:12px 28px;border-radius:99px;text-decoration:none;">${esc(label)} →</a>
  <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:22px 0 0;">For your privacy, the details are in your Morales portal — nothing private is sent by email.</p>
</td></tr></table></td></tr></table></body></html>`;
}
