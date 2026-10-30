import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * getPilotWaitlist — the admin-only read behind the pilot waiting-list screen.
 *
 * Why a function rather than a direct entity read: PilotSignup's create rule is
 * closed so a client cannot post rows straight into the list, and its read rule
 * is admin-only. Reading it here, after checking the caller's own role, keeps
 * that in one place — and means the browser is handed the four fields the
 * screen shows, not the whole row.
 *
 * A non-admin gets 403 and no data: the endpoint is reachable by any signed-in
 * user, so the role check is the access control, not the UI that hides the link.
 */

const ADMIN_ROLES = ['admin', 'platform_admin'];

// Newest first, capped. A waiting list at this stage is read as "who asked and
// when"; the cap keeps one request bounded rather than paginating a page that
// will not reach it.
const MAX_ROWS = 200;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const page = await base44.asServiceRole.entities.PilotSignup.filter(
      {},
      { sort: '-created_date', limit: MAX_ROWS },
    );

    // The SDK returns a page ({items}) when options are passed, an array otherwise.
    const records = Array.isArray(page) ? page : (page?.items ?? []);

    const rows = records.map((r) => ({
      id: r.id,
      email: r.email,
      status: r.status || 'waiting',
      source: r.source || 'pilot_page',
      created_date: r.created_date,
      invited_at: r.invited_at || null,
      note: r.note || '',
    }));

    return Response.json({
      ok: true,
      total: rows.length,
      waiting: rows.filter((r) => r.status === 'waiting').length,
      rows,
    });
  } catch (error) {
    console.error('[getPilotWaitlist]', error);
    return Response.json({ error: 'Could not load the waiting list.' }, { status: 500 });
  }
}