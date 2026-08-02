import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      return Response.json({ error: 'VAPID_PUBLIC_KEY not configured' }, { status: 500 });
    }

    return Response.json({ publicKey });
}, { name: 'getVapidPublicKey' }));
