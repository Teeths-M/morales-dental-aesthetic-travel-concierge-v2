import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { CATEGORY_UNITS, PARTNER_ENTITY_BY_ROLE } from '../../shared/partnerCatalogue.ts';

/**
 * managePartnerService — the only write path for a partner's own catalogue
 * entries.
 *
 * The partner is resolved from the caller's SESSION (role → existing partner
 * entity → record with this email). partner_id / partner_type / partner_email
 * are therefore never accepted from the client, so a partner cannot publish a
 * service under someone else's identity.
 *
 * Publishing is gated on the partner's own real status: a profile that is not
 * active, or whose verification was rejected or suspended, may keep drafts but
 * cannot make an offer searchable. This function never writes verification
 * fields — listing an offer does not verify anyone.
 */

const text = (value: unknown, max = 400) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const list = (value: unknown, max = 40) => (
  Array.isArray(value) ? value.map((v) => text(v, 160)).filter(Boolean).slice(0, max) : []
);
const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const ACTIONS = new Set(['create', 'update', 'pause', 'resume', 'withdraw']);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const payload = await body<any>();
  const action = text(payload.action, 40);
  if (!ACTIONS.has(action)) return err('Unknown action.', 400);

  const roleMap = PARTNER_ENTITY_BY_ROLE[user!.role];
  if (!roleMap) return err('This account does not manage a partner catalogue.', 403);

  const partners = await base44.asServiceRole.entities[roleMap.entity]
    .filter({ email: user!.email }, '-created_date', 1)
    .catch(() => []);
  const partner = partners[0];
  if (!partner) return err('No partner profile is linked to this account.', 404);

  const partnerName = partner.agency_name || partner.full_name || partner.company_name || partner.name || '';
  const canPublish = partner.status === 'active'
    && !['rejected', 'failed', 'suspended'].includes(String(partner.verification_status || ''));

  // ── Existing service, when the action names one ────────────────────────────
  let service: any = null;
  if (payload.service_id) {
    service = await base44.asServiceRole.entities.PartnerService.get(payload.service_id).catch(() => null);
    if (!service) return err('Service not found.', 404);
    if (service.partner_id !== partner.id) return err('That service belongs to another partner.', 403);
    if (service.status === 'suspended' && action !== 'withdraw') {
      return err('This listing is suspended pending review. Contact the care team.', 409);
    }
  }

  if (action === 'pause' || action === 'resume' || action === 'withdraw') {
    if (!service) return err('service_id is required.', 400);
    const status = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'withdrawn';
    if (status === 'active' && !canPublish) {
      return err('Your partner profile is not active yet, so this listing cannot be published.', 409);
    }
    const updated = await base44.asServiceRole.entities.PartnerService.update(service.id, {
      status,
      updated_by: user!.email,
      last_updated_at: new Date().toISOString(),
    });
    // A paused/withdrawn service must not keep a quotable price.
    const cards = await base44.asServiceRole.entities.PartnerRateCard
      .filter({ service_id: service.id }, '-created_date', 20).catch(() => []);
    await Promise.allSettled((cards as any[]).map((card) => base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
      status: status === 'active' ? 'active' : status === 'paused' ? 'paused' : 'withdrawn',
      pricing_status: status === 'withdrawn' ? 'WITHDRAWN' : card.pricing_status,
      last_updated_by: user!.email,
      last_updated_at: new Date().toISOString(),
    })));
    return ok({ service: updated, published: status === 'active' });
  }

  // ── create / update ───────────────────────────────────────────────────────
  const category = text(payload.category, 40) || service?.category;
  if (!category || !CATEGORY_UNITS[category]) return err('Choose a valid service category.', 400);

  const name = text(payload.name, 200) || service?.name;
  if (!name) return err('A service name is required.', 400);

  const components = Array.isArray(payload.package_components)
    ? payload.package_components.map((c: any) => ({
      label: text(c?.label, 160),
      service_id: text(c?.service_id, 100),
      component_state: ['included', 'excluded', 'unpriced'].includes(c?.component_state) ? c.component_state : 'included',
      amount_minor: Number.isInteger(c?.amount_minor) ? c.amount_minor : undefined,
      currency: text(c?.currency, 3).toUpperCase() || undefined,
      note: text(c?.note, 400),
    })).filter((c: any) => c.label)
    : (service?.package_components || []);

  const fields = {
    category,
    name,
    description: text(payload.description, 2000) || service?.description || '',
    origin_label: text(payload.origin_label, 200),
    destination_label: text(payload.destination_label, 200),
    country: text(payload.country, 100),
    city: text(payload.city, 100),
    location_label: text(payload.location_label, 200),
    is_package: payload.is_package === undefined ? Boolean(service?.is_package) : Boolean(payload.is_package),
    package_components: components,
    duration_nights_min: num(payload.duration_nights_min),
    duration_nights_max: num(payload.duration_nights_max),
    capacity_min: num(payload.capacity_min),
    capacity_max: num(payload.capacity_max),
    languages: payload.languages === undefined ? (service?.languages || []) : list(payload.languages),
    conditions: text(payload.conditions, 2000),
    cancellation_terms: text(payload.cancellation_terms, 2000),
    medical_disclaimer_applies: category === 'clinic_procedure',
    updated_by: user!.email,
    last_updated_at: new Date().toISOString(),
  };

  if (action === 'create') {
    const created = await base44.asServiceRole.entities.PartnerService.create({
      ...fields,
      partner_type: roleMap.type,
      partner_id: partner.id,
      partner_email: user!.email,
      partner_display_name: partnerName,
      status: canPublish && payload.publish !== false ? 'active' : 'draft',
      created_by: user!.email,
      missing_fields: ['price'],
    });
    return ok({ service: created, published: created.status === 'active' });
  }

  const wantsPublish = payload.publish === true || service.status === 'active' || service.status === 'paused';
  const updated = await base44.asServiceRole.entities.PartnerService.update(service.id, {
    ...fields,
    partner_display_name: partnerName,
    status: wantsPublish ? (canPublish ? (service.status === 'paused' ? 'paused' : 'active') : 'draft') : 'draft',
  });
  return ok({ service: updated, published: updated.status === 'active' });
}, { name: 'managePartnerService', requireAuth: true }));