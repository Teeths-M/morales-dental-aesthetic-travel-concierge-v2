import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { syncVerificationStateToProvider } from '../../shared/providerVerificationSync.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // BUG-R17-03 FIX: Missing parentheses around role check — operator precedence means
    // `!user || user.role !== 'admin' && user.role !== 'platform_admin'` evaluates as
    // `!user || (user.role !== 'admin' && user.role !== 'platform_admin')` which is correct,
    // but if user is null/undefined, accessing user.role throws TypeError before the guard fires.
    // Add explicit grouping and handle null user safely.
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { provider_id, provider_type } = await req.json();

    if (!provider_id || !provider_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await syncVerificationStateToProvider(base44, provider_id, provider_type);

    return Response.json({ success: true, message: 'Verification state synced' });

  } catch (error) {
    // BUG-R12-01 FIX: SEC-10
    console.error('[syncProviderVerificationState]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'syncProviderVerificationState', requireAuth: false }));