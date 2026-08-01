import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { partner_id, partner_type, reason, admin_notes } = body;

    if (!partner_id || !partner_type) {
      return Response.json({ error: 'partner_id and partner_type are required' }, { status: 400 });
    }

    const entityMap: Record<string, string> = {
      doctor: 'Doctor',
      travel_agency: 'TravelAgency',
      taxi: 'TaxiService',
      security: 'SecurityAgency',
    };

    const entityName = entityMap[partner_type];
    if (!entityName) return Response.json({ error: 'Invalid partner_type' }, { status: 400 });

    const partner: any = await base44.asServiceRole.entities[entityName].get(partner_id).catch(() => null);
    if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 });

    const name = partner.full_name || partner.agency_name || partner.company_name || partner.contact_person || 'Unknown';

    // Create blacklist record — persists the threat so they can't return with a new account
    await base44.asServiceRole.entities.FraudBlacklist.create({
      entity_name: name,
      entity_email: partner.email,
      entity_phone: partner.phone,
      clinic_name: partner.clinic_name || partner.agency_name || partner.company_name || '',
      country: partner.clinic_country || partner.country || partner.operating_country || partner.headquarters_country || '',
      city: partner.clinic_city || partner.city || partner.operating_city || '',
      partner_type,
      source_partner_id: partner_id,
      risk_score: partner.internet_risk_score ?? null,
      risk_level: partner.internet_risk_level ?? null,
      blacklist_reason: reason || 'Manually blacklisted by admin',
      admin_notes: admin_notes || '',
      internet_signals_summary: partner.internet_summary || '',
      blacklisted_by: user.email,
      blacklisted_at: new Date().toISOString(),
      status: 'active',
    }).catch(() => {});

    // Reject and deactivate the partner
    const statusPatch: any = { verification_status: 'rejected', status: 'inactive' };
    if (partner_type === 'doctor') statusPatch.verification_can_be_activated = false;

    await base44.asServiceRole.entities[entityName].update(partner_id, statusPatch).catch(() => {});

    return Response.json({ success: true, message: `${name} has been blacklisted and deactivated` });
  } catch (error) {
    console.error('[blacklistPartner] error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});