/**
 * tripCardSet — the rules for a trip's SET of printed cards.
 *
 * There are only a few, and each one is a correction to an earlier version that
 * would have hurt someone:
 *
 *   1. Two cards, issued together, each with its own token. Revocation used to
 *      kill the whole set, so losing one card meant going cardless until a new
 *      pack arrived. Now a single instance is replaced.
 *   2. Three live cards, maximum. Without a cap, "lost" is an unlimited print
 *      button and live tokens accumulate in no one's hand.
 *   3. Lost ≠ stolen. A card dropped on a pavement and scanned by a stranger is
 *      the product working — the token can only raise an emergency, and a false
 *      alarm costs one assignment fee. So lost stays live and gets a replacement;
 *      stolen is revoked.
 *   4. No local number, no card. Issuance blocks and raises a task. It never
 *      quietly prints a smaller card with no number on it, because the card face
 *      is the single part that has to work with no scan, no signal and no app.
 *   5. The readiness reminder is a trigger, not a screen. 72 hours before the
 *      first flight, an unacknowledged card set is chased.
 *
 * Nothing here touches the database or the network.
 */

export const TRIP_CARD_SET_FLAG = 'trip_card_set';

/** Two cards go out with the pack: one for the bag, one for the bedside. */
export const INITIAL_CARD_COUNT = 2;

/** Three live, then a human decides. */
export const MAX_ACTIVE_INSTANCES = 3;

/** 72 hours before the first flight. */
export const READINESS_LEAD_MS = 72 * 60 * 60 * 1000;

export const PRINT_INSTRUCTION =
  'Keep one card in the bag you carry out of the room, and one on the bedside table where anyone walking in would see it. Never the room safe or your suitcase. Your phone dying or being lost is exactly the moment this card earns its place.';

export const FRONT_LINE = 'This traveller is protected by M-care.';
export const BACK_LINE_EN = 'Scan for help.';
export const BACK_CALL_EN = 'Or call the number on the other side.';

/**
 * The back of the card, in the trip country's own language.
 *
 * Only Latin-script languages are drawn on the PDF face: jsPDF's built-in fonts
 * carry no Arabic, CJK or Thai glyphs, and printing mojibake on a card a stranger
 * has to read would be worse than printing the English line. For those languages
 * the scanned page still renders the local language properly — a browser has the
 * fonts a PDF does not.
 */
export const CARD_BACK_LINES: Record<string, { scan: string; call: string; latin: boolean }> = {
  es: { scan: 'Escanee para pedir ayuda.', call: 'O llame al número del otro lado.', latin: true },
  pt: { scan: 'Digitalize para pedir ajuda.', call: 'Ou ligue para o número do outro lado.', latin: true },
  fr: { scan: "Scannez pour de l'aide.", call: "Ou appelez le numéro de l'autre côté.", latin: true },
  it: { scan: 'Scansiona per chiedere aiuto.', call: "Oppure chiami il numero sull'altro lato.", latin: true },
  de: { scan: 'Scannen Sie für Hilfe.', call: 'Oder rufen Sie die Nummer auf der Rückseite an.', latin: true },
  tr: { scan: 'Yardım için okutun.', call: 'Ya da diğer yüzdeki numarayı arayın.', latin: true },
  th: { scan: 'สแกนเพื่อขอความช่วยเหลือ', call: 'หรือโทรตามหมายเลขด้านหลัง', latin: false },
  ar: { scan: 'امسح طلبًا للمساعدة.', call: 'أو اتصل بالرقم على الوجه الآخر.', latin: false },
  zh: { scan: '扫码求助。', call: '或拨打背面的号码。', latin: false },
  en: { scan: BACK_LINE_EN, call: BACK_CALL_EN, latin: true },
};

export function cardBackLines(lang: string) {
  return CARD_BACK_LINES[String(lang || 'en').toLowerCase()] || CARD_BACK_LINES.en;
}

/**
 * The printed reference. Derived from the token id so it is stable, short enough
 * for a card face, and needs no second source of truth.
 */
export function shortRefFor(tokenId: string): string {
  const clean = String(tokenId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `MC-${clean.slice(0, 6) || 'OPEN00'}`;
}

/**
 * 72 hours before the first flight.
 *
 * departure_date carries no time, so it is read as the date in UTC. That is
 * deliberately early rather than late: a reminder that lands a few hours early
 * still leaves time to print, while one that lands after the flight is worthless.
 */
export function readinessDueAt(firstFlightAt: string | null | undefined): string | null {
  if (!firstFlightAt) return null;
  const t = new Date(firstFlightAt).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t - READINESS_LEAD_MS).toISOString();
}

/** One reminder per readiness cycle, so a retried sweep cannot chase twice. */
export function readinessCycleKey(tripId: string, dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const t = new Date(dueAt).getTime();
  if (!Number.isFinite(t)) return null;
  const hour = new Date(Math.floor(t / 3600000) * 3600000).toISOString();
  return `${tripId}:${hour}`;
}

export function isReadinessDue(
  card: { printed_acknowledged?: boolean; readiness_due_at?: string | null; readiness_cycle_key?: string | null },
  now: string,
): boolean {
  if (card.printed_acknowledged === true) return false;
  if (!card.readiness_due_at) return false;
  const due = new Date(card.readiness_due_at).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(n)) return false;
  if (due > n) return false;
  return card.readiness_cycle_key !== readinessCycleKey(String((card as any).trip_id || ''), card.readiness_due_at);
}

export function canAddInstance(activeCount: number): { allowed: boolean; reason?: string } {
  if (Number(activeCount) >= MAX_ACTIVE_INSTANCES) {
    return {
      allowed: false,
      reason: `This trip already has ${MAX_ACTIVE_INSTANCES} live cards. A care-team member has to review before another is issued.`,
    };
  }
  return { allowed: true };
}

/**
 * Booking confirmed and payment captured are not alternatives: one is the
 * condition, the other is the delivery route. A card minted off a status flag but
 * never delivered is a live token in the world with nobody carrying it. Travel
 * status is deliberately NOT the authority — it moves when flights move, and
 * anything hung off it churns. Card expiry already follows the actual trip end.
 */
export function bookingIsConfirmed(c: any): boolean {
  if (!c) return false;
  if (c.cancelled_at) return false;
  if (String(c.status || '') === 'waiver_refused') return false;
  if (c.travel_confirmed === true) return true;
  if (String(c.itinerary_status || '') === 'CONFIRMED') return true;
  if (String(c.transfer_status || '') === 'CONFIRMED') return true;
  return [
    'Deposit-Paid',
    'PMP-25',
    'PMP-50',
    'Travel-Coordination',
    'Ready-For-Travel',
    'Procedure-In-Progress',
    'SURGICAL_EXECUTION_WINDOW',
    'RECOVERY_PHASE_7_DAY',
    'Recovery',
    'Completed',
  ].includes(String(c.status || ''));
}

export function paymentIsCaptured(c: any): boolean {
  if (!c) return false;
  if (Number(c.amount_paid || 0) > 0) return true;
  if (c.consultation_fee_paid === true) return true;
  return ['25% Paid', '50% Paid', 'Paid In Full'].includes(String(c.payment_status || ''));
}

/** The first flight, which anchors the readiness reminder. */
export function firstFlightAt(c: any): string | null {
  const departure = c?.departure_date ? new Date(c.departure_date) : null;
  if (departure && Number.isFinite(departure.getTime())) return departure.toISOString();
  const procedure = c?.procedure_date ? new Date(c.procedure_date) : null;
  if (procedure && Number.isFinite(procedure.getTime())) {
    return new Date(procedure.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

export function telHref(number: string | null | undefined): string {
  return String(number || '').replace(/[^0-9+]/g, '');
}

export function whatsappHref(number: string | null | undefined): string {
  const clean = String(number || '').replace(/[^0-9]/g, '');
  return clean ? `https://wa.me/${clean}` : '';
}