import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.0.0';

// Inline utilities
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;

class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN');
      }
    }
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

async function retryWithBackoff(fn, options = {}) {
  const { retries = DEFAULT_RETRIES, backoff = 1000, timeout = DEFAULT_TIMEOUT } = options;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const result = await fn({ signal: controller.signal });
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = backoff * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  ['password', 'token', 'apiKey', 'secret', 'email'].forEach(field => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
}

const paymentCircuitBreaker = new CircuitBreaker(3, 300000); // 5 min reset
const IDEMPOTENCY_CACHE = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validate authentication
    const user = await base44.auth.me().catch(() => null);
    const isAdmin = user && user.role === 'admin';
    const isServiceRole = !user;

    if (!isAdmin && !isServiceRole) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id, deposit_option } = await req.json();
    
    if (!case_id) {
      return Response.json({ error: 'case_id required' }, { status: 400 });
    }

    // Idempotency check - prevent duplicate payments
    const idempotencyKey = `payment_${case_id}_${deposit_option}`;
    if (IDEMPOTENCY_CACHE.has(idempotencyKey)) {
      const cached = IDEMPOTENCY_CACHE.get(idempotencyKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 min window
        console.log('Duplicate payment request detected, returning cached result');
        return Response.json(cached.result);
      }
    }

    // Fetch CaseRecord with retry
    let caseRecord;
    try {
      caseRecord = await retryWithBackoff(
        async () => await base44.asServiceRole.entities.CaseRecord.get(case_id),
        { retries: 2, timeout: 8000 }
      );
    } catch (error) {
      console.error('Failed to fetch case:', error.message);
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Validate deposit option
    const validOptions = ['Full', '50%', '25%'];
    if (!validOptions.includes(deposit_option)) {
      return Response.json({ 
        error: 'Invalid deposit_option. Use: Full, 50%, or 25%' 
      }, { status: 400 });
    }

    // Calculate amount
    const finalPrice = caseRecord.final_package_price || 0;
    if (finalPrice <= 0) {
      return Response.json({ error: 'Invalid package price' }, { status: 400 });
    }

    let amountDue = 0;
    let planType = '';

    if (deposit_option === 'Full') {
      amountDue = finalPrice * 0.95; // 5% discount
      planType = 'full_payment';
    } else if (deposit_option === '50%') {
      amountDue = finalPrice * 0.50;
      planType = 'deposit_50';
    } else if (deposit_option === '25%') {
      amountDue = finalPrice * 0.25;
      planType = 'deposit_25';
    }

    // Initialize Stripe with error handling
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);

    // Create checkout session with circuit breaker
    let session;
    try {
      session = await paymentCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            return await stripe.checkout.sessions.create({
              payment_intent_data: {
                metadata: {
                  case_id: caseRecord.id,
                  client_email: caseRecord.client_email,
                  client_name: caseRecord.client_name,
                  plan_type: planType,
                  procedure: caseRecord.procedures?.[0] || 'Unknown'
                }
              },
              line_items: [
                {
                  price_data: {
                    currency: 'usd',
                    product_data: {
                      name: `${caseRecord.client_name} - Medical Travel Package`,
                      description: `${planType === 'full_payment' ? 'Full Payment (5% discount)' : planType === 'deposit_50' ? '50% Deposit' : '25% Deposit'}`,
                    },
                    unit_amount: Math.round(amountDue * 100),
                  },
                  quantity: 1,
                },
              ],
              mode: 'payment',
              success_url: `${Deno.env.get('APP_URL')}/portal/proposal/${caseRecord.proposal_token}?payment=success`,
              cancel_url: `${Deno.env.get('APP_URL')}/portal/proposal/${caseRecord.proposal_token}?payment=cancelled`,
              customer_email: caseRecord.client_email,
              metadata: {
                case_id: caseRecord.id,
                plan_type: planType,
                client_email: caseRecord.client_email,
                idempotency_key: idempotencyKey
              },
              expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
            });
          },
          { timeout: 15000, retries: 2 }
        );
      });
    } catch (stripeError) {
      console.error('Stripe session creation failed:', sanitizeForLogging(stripeError));
      
      // Graceful degradation
      return Response.json({
        error: 'Payment system temporarily unavailable',
        fallback_message: 'Please contact concierge to complete your booking',
        contact: 'concierge@morales-dental.com'
      }, { status: 503 });
    }

    // Cache for idempotency
    const result = { 
      success: true,
      payment_url: session.url,
      case_id: caseRecord.id,
      amount_due: amountDue,
      plan_type: planType,
      session_id: session.id
    };
    
    IDEMPOTENCY_CACHE.set(idempotencyKey, {
      result,
      timestamp: Date.now()
    });

    return Response.json(result);

  } catch (error) {
    console.error('Payment generation failed:', sanitizeForLogging(error));
    
    return Response.json({ 
      error: 'Payment processing failed',
      message: error.message 
    }, { status: 500 });
  }
});