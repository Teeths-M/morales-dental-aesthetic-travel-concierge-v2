import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const apiKey = Deno.env.get("EXCHANGERATE_API_KEY");
        if (!apiKey) {
            return Response.json({ error: "EXCHANGERATE_API_KEY not configured" }, { status: 500 });
        }

        const body = await req.json().catch(() => ({}));
        // Always enforce USD as the base currency to prevent chain conversion errors
        const base = 'USD';
        const target = body.target || new URL(req.url).searchParams.get('target');

        if (!target) {
            return Response.json({ error: "Target currency is required" }, { status: 400 });
        }

        // If base and target are the same, return 1.0
        if (base === target) {
            return Response.json({ rate: 1.0, base, target });
        }

        const response = await fetch(
            `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`
        );
        const data = await response.json();

        if (data.result !== 'success') {
            return Response.json({ error: 'Failed to fetch exchange rate', details: data }, { status: response.status });
        }

        const rate = data.conversion_rates[target];
        if (!rate) {
            return Response.json({ error: `Currency ${target} not found` }, { status: 404 });
        }

        return Response.json({ rate, base, target, timestamp: new Date().toISOString() });

    } catch (error) {
        return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
    }
});