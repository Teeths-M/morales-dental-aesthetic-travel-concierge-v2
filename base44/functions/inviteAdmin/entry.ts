import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    await base44.users.inviteUser(email, 'admin');

    return Response.json({
      status: 'success',
      message: `Admin invitation sent to ${email}`
    });
  } catch (error) {
    // BUG-R4-11 FIX: SEC-10 — never expose internal error details
    console.error('[inviteAdmin]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});