/**
 * manageMedicalTravelGroup — create or join a coordinated medical-tourism group.
 *
 * action: 'create' — the leader starts a group (multiple patients, same
 *   procedure, same destination, same travel window). M-Care coordinates
 *   shared logistics on top; each member keeps their own CaseRecord + Safe-T
 *   screening.
 * action: 'join'   — a patient joins an existing group by id, optionally
 *   linking their CaseRecord so the cohort can be moved together.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let caller: any = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    if (!caller) return Response.json({ error: 'Authentication required' }, { status: 401 });

    let body: any = null;
    try { body = await req.json(); } catch (_) { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const action = body?.action;
    if (!action) return Response.json({ error: 'action is required (create | join)' }, { status: 400 });

    if (action === 'create') {
      const {
        group_name, group_leader_email, group_leader_name,
        procedure, destination_country, destination_city,
        travel_start_date, travel_end_date,
        member_emails = [], member_names = [], member_case_ids = [],
        notes,
      } = body || {};
      if (!group_name || !group_leader_email || !procedure || !destination_country || !destination_city) {
        return Response.json({ error: 'group_name, group_leader_email, procedure, destination_country, destination_city are required' }, { status: 400 });
      }
      const emails: string[] = Array.from(new Set([group_leader_email, ...(member_emails || [])]));
      const names: string[] = member_names && member_names.length ? member_names : emails.map(() => '');
      const caseIds: string[] = member_case_ids || [];

      const group = await base44.asServiceRole.entities.MedicalTravelGroup.create({
        group_name, group_leader_email,
        group_leader_name: group_leader_name || '',
        procedure, destination_country, destination_city,
        travel_start_date: travel_start_date || null,
        travel_end_date: travel_end_date || null,
        member_emails: emails,
        member_names: names,
        member_case_ids: caseIds,
        member_count: emails.length,
        status: 'forming',
        shared_travel_agency_id: '',
        shared_clinic_name: '',
        shared_driver_pool_ids: [],
        notes: notes || '',
      });

      return Response.json({ success: true, group_id: group.id, member_count: emails.length });
    }

    if (action === 'join') {
      const { group_id, member_email, member_name, case_id } = body || {};
      if (!group_id || !member_email) {
        return Response.json({ error: 'group_id and member_email are required' }, { status: 400 });
      }
      let group: any = null;
      try { group = await base44.asServiceRole.entities.MedicalTravelGroup.get(group_id); } catch (_) { group = null; }
      if (!group) return Response.json({ error: 'Group not found' }, { status: 404 });
      if (group.status === 'completed' || group.status === 'cancelled') {
        return Response.json({ error: `Cannot join a ${group.status} group` }, { status: 409 });
      }

      const emails: string[] = Array.isArray(group.member_emails) ? group.member_emails : [];
      if (!emails.includes(member_email)) {
        emails.push(member_email);
      }
      const names: string[] = Array.isArray(group.member_names) ? [...group.member_names] : [];
      if (member_name && names.length < emails.length) names.push(member_name);
      const caseIds: string[] = Array.isArray(group.member_case_ids) ? group.member_case_ids : [];
      if (case_id && !caseIds.includes(case_id)) caseIds.push(case_id);

      await base44.asServiceRole.entities.MedicalTravelGroup.update(group_id, {
        member_emails: emails,
        member_names: names,
        member_case_ids: caseIds,
        member_count: emails.length,
      });

      return Response.json({ success: true, group_id, member_count: emails.length, joined: member_email });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[manageMedicalTravelGroup]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});