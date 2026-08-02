/**
 * verifyStripeSignature — shared Stripe webhook signature verification
 *
 * Was previously duplicated verbatim between stripePaymentWebhook and
 * stripeIdentityWebhook. Both webhook receivers must read the RAW,
 * unparsed request body — Stripe's HMAC signature is computed over the
 * exact bytes sent, so a body that's already been JSON.parse'd and
 * re-stringified will fail verification even with the correct secret.
 * Both callers therefore stay outside createHandler (which parses JSON).
 */

import Stripe from 'npm:stripe@17.0.0';

export interface VerifyStripeSignatureOptions {
  /** Env var names to try in order — first one set wins. Lets a webhook
   *  use its own dedicated secret with a shared fallback. */
  secretEnvVars: string[];
  /** Optional extra guidance surfaced in the 503 body when no secret is set. */
  setupInstructions?: string[];
}

export interface VerifyStripeSignatureResult {
  event: Stripe.Event | null;
  /** Non-null means verification failed — return this Response directly. */
  errorResponse: Response | null;
}

export async function verifyStripeSignature(
  req: Request,
  { secretEnvVars, setupInstructions }: VerifyStripeSignatureOptions,
): Promise<VerifyStripeSignatureResult> {
  let webhookSecret: string | undefined;
  for (const name of secretEnvVars) {
    webhookSecret = Deno.env.get(name);
    if (webhookSecret) break;
  }
  if (!webhookSecret) {
    console.error('[verifyStripeSignature] No webhook secret configured for', secretEnvVars.join(', '));
    return {
      event: null,
      errorResponse: Response.json({
        error: 'Webhook secret not configured.',
        ...(setupInstructions ? { setup_instructions: setupInstructions } : {}),
      }, { status: 503 }),
    };
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return { event: null, errorResponse: Response.json({ error: 'STRIPE_SECRET_KEY not configured.' }, { status: 503 }) };
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return { event: null, errorResponse: Response.json({ error: 'Missing stripe-signature header' }, { status: 400 }) };
  }

  // Read raw body — must NOT parse as JSON before signature verification
  const body = await req.text();
  const stripe = new Stripe(stripeKey);

  try {
    // constructEventAsync is required in Deno (uses SubtleCrypto which is async)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    return { event, errorResponse: null };
  } catch (err) {
    console.error('[verifyStripeSignature] Signature verification failed:', err.message);
    return { event: null, errorResponse: Response.json({ error: 'Invalid webhook signature' }, { status: 400 }) };
  }
}
