import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { formatMinor } from '../../shared/partnerMoney.ts';
import { derivePricingStatus } from '../../shared/partnerCatalogue.ts';

/**
 * buildJourneyEstimate — the itemized journey estimate.
 *
 * The blueprint requires nine named lines (procedure, flights, accommodation,
 * ground transport, companion, recovery, M-Care protection, additional costs,
 * total) and forbids hiding the difference between a partner-confirmed price
 * and one that still needs a quotation.
 *
 * So this function does one thing: it takes the offers a traveller actually
 * selected and lays them out under those nine headings, carrying for each line
 * exactly what is known — the amount, the currency, how many units, which
 * partner, when the price was last confirmed, and whether the number is a firm
 * price, a "from" price, or nothing at all (quote required).
 *
 * Three rules are absolute:
 *
 * 1. A line with no usable price shows NO number. It never shows 0, and it is
 *    never silently omitted — a missing line reads as "included" to a traveller.
 * 2. The total only adds line amounts that are firm, current and computable in
 *    one currency. Anything else makes the total explicitly partial, and the
 *    partial flag travels with the number.
 * 3. Nothing is inferred from a partner's silence. No rate card means no price,
 *    not an estimate of one.
 */

const CANONICAL_LINES: Array<{
  key: string;
  label: string;
  categories: string[];
  empty_note: string;
}> = [
  {
    key: 'procedure',
    label: 'Procedure',
    categories: ['clinic_procedure'],
    empty_note: 'No clinic price selected yet. A clinic quote is requested once you choose a procedure.',
  },
  {
    key: 'flights',
    label: 'Flights',
    categories: ['flight'],
    empty_note: 'No flight fare selected. Airfares change daily, so M-Care quotes them at the time of booking.',
  },
  {
    key: 'accommodation',
    label: 'Accommodation',
    categories: ['lodging'],
    empty_note: 'No accommodation price selected. Hotel partners are not yet publishing rates on this corridor.',
  },
  {
    key: 'ground_transport',
    label: 'Ground transport',
    categories: ['transfer', 'chauffeur_hourly'],
    empty_note: 'No ground transport selected. Airport and clinic transfers are quoted per journey.',
  },
  {
    key: 'companion',
    label: 'Companion support',
    categories: ['companion_care'],
    empty_note: 'No companion support selected.',
  },
  {
    key: 'recovery',
    label: 'Recovery services',
    categories: [],
    empty_note: 'Recovery support is arranged after your procedure, priced against what you actually need.',
  },
  {
    key: 'mcare_protection',
    label: 'M-Care protection package',
    categories: [],
    empty_note: 'M-Care protection is quoted with your journey — it depends on your destination and dates.',
  },
  {
    key: 'additional_costs',
    label: 'Additional costs',
    categories: [],
    empty_note: 'Taxes, fees and contingencies are listed here once known. Nothing is added silently.',
  },
];

/** How many units of a card a journey needs, or null when it can't be known. */
function quantityFor(
  pricingUnit: string,
  nights: number,
  travellers: number,
): { count: number; basis: string } | null {
  switch (pricingUnit) {
    case 'per_night':
      return { count: nights, basis: `${nights} night${nights === 1 ? '' : 's'}` };
    case 'per_person':
      return { count: travellers, basis: `${travellers} traveller${travellers === 1 ? '' : 's'}` };
    case 'per_day':
      return { count: nights, basis: `${nights} day${nights === 1 ? '' : 's'}` };
    case 'fixed':
    case 'per_trip':
    case 'per_vehicle':
    case 'per_package':
    case 'starting_from':
      return { count: 1, basis: 'per journey' };
    case 'per_hour':
      // Hours are not part of the request, so the amount cannot be multiplied
      // honestly. Reported as quote-required rather than assumed.
      return null;
    case 'quote_required':
    default:
      return null;
  }
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const payload = await body<any>();

  const serviceIds: string[] = Array.isArray(payload.service_ids)
    ? Array.from(new Set(payload.service_ids.filter((id: unknown) => typeof id === 'string' && id.trim())))
    : [];

  if (serviceIds.length > 12) {
    return err('Select no more than 12 services for one estimate.');
  }

  const nights = Math.min(Math.max(Number(payload.nights) || 1, 1), 90);
  const travellers = Math.min(Math.max(Number(payload.travellers) || 1, 1), 12);

  // Traveller-supplied extra costs (taxes, fees). Amounts must already be
  // integer minor units; anything else is dropped rather than coerced.
  const rawExtras = Array.isArray(payload.additional_costs) ? payload.additional_costs : [];
  const extras = rawExtras
    .filter((row: any) => row && typeof row.label === 'string' && row.label.trim())
    .filter((row: any) => Number.isInteger(row.amount_minor) && row.amount_minor >= 0)
    .slice(0, 10)
    .map((row: any) => ({
      label: row.label.trim().slice(0, 80),
      amount_minor: row.amount_minor,
      currency: String(row.currency || 'USD').toUpperCase(),
    }));

  if (serviceIds.length === 0 && extras.length === 0) {
    return ok({
      lines: CANONICAL_LINES.map((line) => ({
        key: line.key,
        label: line.label,
        status: 'not_selected',
        price_kind: null,
        amount_minor: null,
        amount_display: null,
        currency: null,
        source_note: line.empty_note,
        partner_name: null,
        pricing_status: null,
        last_confirmed_at: null,
        counts_toward_total: false,
      })),
      total: {
        amount_minor: null,
        amount_display: null,
        currency: null,
        is_partial: true,
        priced_line_count: 0,
        unpriced_line_count: CANONICAL_LINES.length,
        method: 'nothing_selected',
      },
      notes: ['Nothing has been selected yet. Every line stays unpriced until a real partner price exists.'],
      generated_at: new Date().toISOString(),
    });
  }

  // ── Load the selected services and their current rate cards ────────────────
  const services = await Promise.all(
    serviceIds.map((id) => base44.asServiceRole.entities.PartnerService.get(id).catch(() => null)),
  );

  const cards = await base44.asServiceRole.entities.PartnerRateCard
    .filter({ service_id: { $in: serviceIds } }, '-last_updated_at', 200)
    .then((page: any) => page?.items ?? page ?? [])
    .catch(() => []);

  const now = new Date();

  /** Best usable card for a service: active, current first, then cheapest. */
  function bestCardFor(serviceId: string): any | null {
    const candidates = (cards as any[])
      .filter((card) => card.service_id === serviceId)
      .filter((card) => (card.status || 'active') === 'active')
      .map((card) => ({ card, status: derivePricingStatus(card, now) }))
      .filter(({ status }) => status !== 'WITHDRAWN');

    if (candidates.length === 0) return null;

    const rank = (status: string) =>
      status === 'CURRENT_PARTNER_CONFIRMED' ? 0
        : status === 'PARTNER_SUBMITTED' ? 1
          : status === 'STALE' ? 2
            : 3;

    candidates.sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return (a.card.amount_minor ?? Number.MAX_SAFE_INTEGER) - (b.card.amount_minor ?? Number.MAX_SAFE_INTEGER);
    });

    return { ...candidates[0].card, _pricing_status: candidates[0].status };
  }

  const nowIso = now.toISOString();
  const notes: string[] = [];
  const serviceLines: any[] = [];

  for (const service of services as any[]) {
    if (!service) continue;

    // Only a live listing can be priced: a draft (partner not approved yet), paused, withdrawn or suspended one
    // is shown as not offered, never with its price.
    if (service.status !== 'active') {
      serviceLines.push({
        category: service.category,
        status: 'unpriced',
        amount_minor: null,
        currency: null,
        partner_name: service.partner_display_name || null,
        pricing_status: null,
        source_note: `${service.name} is not currently offered.`,
        last_confirmed_at: null,
      });
      continue;
    }

    const card = bestCardFor(service.id);

    if (!card) {
      serviceLines.push({
        category: service.category,
        status: 'unpriced',
        amount_minor: null,
        currency: null,
        partner_name: service.partner_display_name || null,
        pricing_status: null,
        source_note: `${service.name} is listed, but its partner has not published a price yet.`,
        last_confirmed_at: null,
      });
      continue;
    }

    const unit = card.pricing_unit || 'quote_required';
    const quantity = quantityFor(unit, nights, travellers);
    const priceKind = card.price_kind || 'quote_required';
    const pricingStatus = card._pricing_status;

    const amountKnown =
      typeof card.amount_minor === 'number'
      && Number.isFinite(card.amount_minor)
      && card.amount_minor >= 0
      && priceKind !== 'quote_required'
      && quantity !== null
      && ['CURRENT_PARTNER_CONFIRMED', 'PARTNER_SUBMITTED'].includes(pricingStatus);

    if (!amountKnown) {
      const reason = priceKind === 'quote_required'
        ? `${service.name}: the partner quotes each journey individually.`
        : pricingStatus === 'STALE' || pricingStatus === 'EXPIRED'
          ? `${service.name}: the published price is out of date and is being re-confirmed.`
          : quantity === null
            ? `${service.name}: priced hourly, and hours are not set yet.`
            : `${service.name}: no usable price is on file.`;

      serviceLines.push({
        category: service.category,
        status: 'quote_required',
        amount_minor: null,
        currency: card.currency || null,
        partner_name: card.partner_display_name || service.partner_display_name || null,
        pricing_status: pricingStatus,
        source_note: reason,
        last_confirmed_at: card.last_confirmed_at || null,
      });
      continue;
    }

    serviceLines.push({
      category: service.category,
      status: 'priced',
      amount_minor: card.amount_minor,
      currency: String(card.currency || 'USD').toUpperCase(),
      quantity_count: quantity.count,
      quantity_basis: quantity.basis,
      line_amount_minor: card.amount_minor * quantity.count,
      price_kind: priceKind,
      pricing_status: pricingStatus,
      partner_name: card.partner_display_name || service.partner_display_name || null,
      service_name: service.name,
      location_label: service.location_label || card.location_label || null,
      taxes_and_fees_minor: Number.isInteger(card.taxes_and_fees_minor) ? card.taxes_and_fees_minor : null,
      source_note:
        priceKind === 'starting_from'
          ? 'A "from" price — the final cost is confirmed with the partner.'
          : pricingStatus === 'PARTNER_SUBMITTED'
            ? 'Submitted by the partner and not yet re-confirmed.'
            : null,
      last_confirmed_at: card.last_confirmed_at || null,
    });
  }

  // ── Compose the nine canonical lines ──────────────────────────────────────
  const lines = CANONICAL_LINES.map((definition) => {
    if (definition.key === 'additional_costs') {
      if (extras.length === 0) {
        return {
          key: definition.key,
          label: definition.label,
          status: 'not_selected',
          price_kind: null,
          amount_minor: null,
          amount_display: null,
          currency: null,
          detail: extras,
          source_note: definition.empty_note,
          partner_name: null,
          pricing_status: null,
          last_confirmed_at: null,
          counts_toward_total: false,
        };
      }
      // Extras may arrive in different currencies; only same-currency rows are summed.
      const currencies = Array.from(new Set(extras.map((row) => row.currency)));
      const currency = currencies.length === 1 ? currencies[0] : null;
      const totalMinor = currency
        ? extras.reduce((sum, row) => sum + row.amount_minor, 0)
        : null;
      return {
        key: definition.key,
        label: definition.label,
        status: currency ? 'priced' : 'mixed_currency',
        price_kind: 'firm',
        amount_minor: totalMinor,
        amount_display: currency ? formatMinor(totalMinor, currency) : null,
        currency,
        detail: extras,
        source_note: currency
          ? 'Entered by you — taxes, fees or contingencies you were told about.'
          : 'These costs are in different currencies and cannot be added into one figure.',
        partner_name: null,
        pricing_status: null,
        last_confirmed_at: null,
        counts_toward_total: Boolean(currency),
      };
    }

    const matching = serviceLines.filter((line) => definition.categories.includes(line.category));

    if (matching.length === 0) {
      return {
        key: definition.key,
        label: definition.label,
        status: 'not_selected',
        price_kind: null,
        amount_minor: null,
        amount_display: null,
        currency: null,
        source_note: definition.empty_note,
        partner_name: null,
        pricing_status: null,
        last_confirmed_at: null,
        counts_toward_total: false,
      };
    }

    const priced = matching.filter((line) => line.status === 'priced');

    // A heading with several selected services is shown as its parts, never as
    // one collapsed number: two partners' prices are two prices.
    if (matching.length > 1) {
      const sameCurrency = Array.from(new Set(priced.map((line) => line.currency)));
      const currency = sameCurrency.length === 1 ? sameCurrency[0] : null;
      const summable = priced.length === matching.length && currency;
      const totalMinor = summable
        ? priced.reduce((sum, line) => sum + line.line_amount_minor, 0)
        : null;

      return {
        key: definition.key,
        label: definition.label,
        status: summable ? 'priced' : priced.length > 0 ? 'partly_priced' : 'quote_required',
        price_kind: summable ? 'firm' : null,
        amount_minor: totalMinor,
        amount_display: summable ? formatMinor(totalMinor, currency) : null,
        currency: currency || null,
        parts: matching.map((line) => ({
          label: line.service_name || line.partner_name || 'Service',
          partner_name: line.partner_name,
          status: line.status,
          amount_minor: line.line_amount_minor ?? null,
          amount_display: line.amount_minor !== null ? formatMinor(line.line_amount_minor, line.currency) : null,
          currency: line.currency,
          price_kind: line.price_kind || 'quote_required',
          pricing_status: line.pricing_status,
          source_note: line.source_note,
        })),
        source_note: summable
          ? null
          : 'Some parts of this line are not yet priced — the figure covers only the confirmed parts.',
        partner_name: null,
        pricing_status: null,
        last_confirmed_at: null,
        counts_toward_total: Boolean(summable),
      };
    }

    const single = matching[0];

    if (single.status !== 'priced') {
      return {
        key: definition.key,
        label: definition.label,
        status: 'quote_required',
        price_kind: 'quote_required',
        amount_minor: null,
        amount_display: null,
        currency: single.currency,
        source_note: single.source_note,
        partner_name: single.partner_name,
        pricing_status: single.pricing_status,
        last_confirmed_at: single.last_confirmed_at,
        counts_toward_total: false,
      };
    }

    const isFirm = single.price_kind === 'firm' && single.pricing_status === 'CURRENT_PARTNER_CONFIRMED';

    return {
      key: definition.key,
      label: definition.label,
      status: 'priced',
      price_kind: single.price_kind,
      amount_minor: single.line_amount_minor,
      amount_display: formatMinor(single.line_amount_minor, single.currency),
      currency: single.currency,
      unit_amount_display: formatMinor(single.amount_minor, single.currency),
      quantity_basis: single.quantity_basis,
      partner_name: single.partner_name,
      location_label: single.location_label,
      pricing_status: single.pricing_status,
      taxes_and_fees_minor: single.taxes_and_fees_minor,
      source_note: single.source_note,
      last_confirmed_at: single.last_confirmed_at,
      counts_toward_total: isFirm,
    };
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  const counted = lines.filter((line) => line.counts_toward_total);
  const currencies = Array.from(new Set(counted.map((line) => line.currency)));

  let total: any;
  if (counted.length === 0) {
    total = {
      amount_minor: null,
      amount_display: null,
      currency: null,
      is_partial: true,
      priced_line_count: lines.filter((line) => line.amount_minor !== null).length,
      unpriced_line_count: lines.filter((line) => line.amount_minor === null).length,
      method: 'no_firm_lines',
    };
    notes.push('No firm partner price has been confirmed yet, so no total is shown.');
  } else if (currencies.length > 1) {
    total = {
      amount_minor: null,
      amount_display: null,
      currency: null,
      is_partial: true,
      priced_line_count: counted.length,
      unpriced_line_count: lines.filter((line) => !line.counts_toward_total).length,
      method: 'mixed_currency',
    };
    notes.push('These prices are in more than one currency, so they are listed individually rather than added together.');
  } else {
    const currency = currencies[0] as string;
    const amountMinor = counted.reduce((sum, line) => sum + line.amount_minor, 0);
    const excluded = lines.filter((line) => !line.counts_toward_total).length;
    total = {
      amount_minor: amountMinor,
      amount_display: formatMinor(amountMinor, currency),
      currency,
      is_partial: excluded > 0,
      priced_line_count: counted.length,
      unpriced_line_count: excluded,
      method: 'sum_of_firm_lines',
    };
    if (excluded > 0) {
      notes.push(
        `${excluded} line${excluded === 1 ? '' : 's'} in this estimate ${excluded === 1 ? 'is' : 'are'} not yet firm and ${excluded === 1 ? 'is' : 'are'} not included in the total.`,
      );
    }
  }

  notes.push(`Prices shown were current as at ${nowIso.slice(0, 10)}.`);

  // A verification claim is never made here. The estimate says what is priced,
  // not who should be trusted.
  return ok({
    lines,
    total,
    notes,
    inputs: { nights, travellers, service_count: serviceIds.length },
    generated_at: nowIso,
  });
}, { name: 'buildJourneyEstimate', requireAuth: false, rateLimit: { max: 40, windowSeconds: 60 } }));