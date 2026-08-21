// ── extractContactInfo ──────────────────────────────────────────────────────
// Pure, deterministic contact-info extraction from a page's raw fetched HTML.
// The mirror image of contactScrub.ts (which redacts contact info from
// patient<->doctor quote messages) -- reuses the same EMAIL_RE/PHONE_RE
// shapes in the opposite direction: extraction instead of redaction, plus a
// JSON-LD/wa.me pass those redaction regexes never needed. Never invents a
// contact method that isn't actually present in the text -- an empty array
// is an honest "found nothing," not a failure.

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_RE = /\+?\d[\d\s().-]{4,}\d/g;
const WA_LINK_RE = /(?:wa\.me|whatsapp\.com\/send)\/?\?*(?:phone=)?(\+?\d[\d\s().-]{4,}\d)/gi;
const JSON_LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export interface ExtractedContactInfo {
  emails: string[];
  phones: string[];
  whatsapp: string[];
  addresses: string[];
}

function stripTags(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

function validDigitCount(s: string): boolean {
  const digits = (s.match(/\d/g) || []).length;
  return digits >= 7 && digits <= 15;
}

export function extractContactInfo(html: string): ExtractedContactInfo {
  const raw = String(html || '');
  const text = stripTags(raw);

  const emails: string[] = text.match(EMAIL_RE) || [];
  const phones: string[] = (text.match(PHONE_RE) || []).filter(validDigitCount);
  const whatsapp: string[] = [];
  const addresses: string[] = [];

  let waMatch: RegExpExecArray | null;
  WA_LINK_RE.lastIndex = 0;
  while ((waMatch = WA_LINK_RE.exec(raw))) {
    if (waMatch[1]) whatsapp.push(waMatch[1]);
  }

  // Many real business sites embed exact phone/email/address as JSON-LD
  // structured data (schema.org LocalBusiness/Organization) even when the
  // visible page text is sparse or partly JS-rendered.
  let ldMatch: RegExpExecArray | null;
  JSON_LD_RE.lastIndex = 0;
  while ((ldMatch = JSON_LD_RE.exec(raw))) {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (node?.telephone) phones.push(String(node.telephone));
        if (node?.email) emails.push(String(node.email));
        const addr = node?.address;
        if (typeof addr === 'string') addresses.push(addr);
        else if (addr && typeof addr === 'object') {
          const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean);
          if (parts.length) addresses.push(parts.join(', '));
        }
      }
    } catch (_) { /* not valid JSON-LD -- skip, never guess */ }
  }

  return {
    emails: uniq(emails).slice(0, 5),
    phones: uniq(phones.filter(validDigitCount)).slice(0, 5),
    whatsapp: uniq(whatsapp).slice(0, 3),
    addresses: uniq(addresses).slice(0, 3),
  };
}
