import { createHandler, ok } from '../../shared/createHandler.ts';

/**
 * getPilotWaitlist — the admin-only read behind the pilot waiting-list screen.
 *
 * Why a function rather than a direct entity read: PilotSignup's create rule is
 * closed so a client cannot post rows straight into the list, and its read rule
 * is admin-only. Reading it here, after checking the caller's own role, keeps
 * that in one place — and means the browser is handed the fields the screen
 * shows, not the whole row.
 *
 * Runs on the shared createHandler: it registers the real Deno.serve entrypoint
 * (this file used to be a bare `export default async function`, which Base44
 * never registers, so the admin screen could not load) and enforces the admin
 * role before the handler runs. A non-admin gets 403 and no data.
 */

// Newest first, capped. A waiting list at this stage is read as "who asked and
// when"; the cap keeps one request bounded rather than paginating a page that
// will not reach it.
const MAX_ROWS = 200;

Deno.serve(createHandler(async ({ base44 }) => {
  // createHandler's SDK (0.8.31) takes sort and limit as plain arguments. The
  // newer `{ sort, limit }` options object it was first written with is not
  // understood by that version, so the list came back empty or failed.
  const page = await base44.asServiceRole.entities.PilotSignup.filter({}, '-created_date', MAX_ROWS);

  // An array in this SDK; a page ({items}) in newer ones. Accept either.
  const records = Array.isArray(page) ? page : (page?.items ?? []);

  const rows = records.map((r: Record<string, any>) => ({
    id: r.id,
    email: r.email,
    phone: r.phone || '',
    status: r.status || 'waiting',
    source: r.source || 'pilot_page',
    // Which ad, card or post they scanned (the ?src= tag on the /pilot link).
    campaign: r.campaign || '',
    created_date: r.created_date,
    invited_at: r.invited_at || null,
    note: r.note || '',
  }));

  return ok({
    ok: true,
    total: rows.length,
    waiting: rows.filter((r) => r.status === 'waiting').length,
    rows,
  });
}, { name: 'getPilotWaitlist', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
