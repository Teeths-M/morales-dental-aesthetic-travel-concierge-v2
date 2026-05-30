import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const ipinfoApiKey = Deno.env.get("IPINFO_API_KEY");
        if (!ipinfoApiKey) {
            return Response.json({ error: "IPINFO_API_KEY not configured" }, { status: 500 });
        }

        const ipinfoResponse = await fetch(`https://ipinfo.io/json?token=${ipinfoApiKey}`);
        const ipinfoData = await ipinfoResponse.json();

        if (!ipinfoResponse.ok) {
            return Response.json({ error: "Failed to get geolocation data" }, { status: ipinfoResponse.status });
        }

        const countryCode = ipinfoData.country;
        let currencyCode = ipinfoData.currency || 'USD';

        // Custom currency overrides
        if (countryCode === 'VE') {
            currencyCode = 'USD'; // Venezuela defaults to USD display
        }

        const countryToCurrencyMap = {
            'US': 'USD',
            'CA': 'CAD',
            'GB': 'GBP',
            'TT': 'TTD',
            'GY': 'GYD',
        };

        if (countryToCurrencyMap[countryCode]) {
            currencyCode = countryToCurrencyMap[countryCode];
        }

        return Response.json({ country: countryCode, currency: currencyCode });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});