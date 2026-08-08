// ── Universal trip-readiness tips (deterministic, timeless) ──────────────────
// "How do I get ready for my flight/trip" guidance that doesn't change day to
// day — hydration, sleep, movement, comfort, jet lag, packing basics. Kept as
// fixed, curated content (same discipline as preOpChecklist.ts) rather than a
// live LLM call: none of this is time-sensitive or destination-specific, so
// asking a model to regenerate it on every request would be slower, costlier,
// and no more reliable than writing it once. Destination-specific content
// (climate, local customs) belongs in a live-web-grounded lookup instead —
// see getTripReadinessTips/entry.ts, which pairs this with a
// mcareResearchAndLearn call for that part.
//
// General comfort/lifestyle guidance only — never medical advice, and never
// gated on procedure specifics (this is for the outbound flight, before any
// procedure has happened, so none of the post-op constraints in
// preOpChecklist.ts apply here).

export interface TravelTip { category: string; text: string; }

export function getUniversalTravelTips(): TravelTip[] {
  return [
    { category: 'hydration', text: 'Drink water before and during your flight — cabin air is very dry, and it is easy to arrive more dehydrated than you realise.' },
    { category: 'sleep', text: 'Try to get a good night\'s sleep before you travel, and if your flight crosses time zones, consider adjusting your sleep schedule a day or two ahead.' },
    { category: 'movement', text: 'On longer flights, stand up, stretch, and walk the aisle every couple of hours to keep your circulation moving.' },
    { category: 'comfort', text: 'Wear comfortable, loose-fitting clothing and layers — cabin temperatures vary a lot.' },
    { category: 'jet_lag', text: 'If you\'re crossing time zones, get natural light at your destination as soon as you can — it helps you adjust faster.' },
    { category: 'motion', text: 'If you\'re prone to motion sickness, an aisle seat over the wing tends to be the most stable spot.' },
    { category: 'documents', text: 'Double-check your passport, any visa requirements, and keep a digital copy of your itinerary somewhere you can reach it offline.' },
    { category: 'packing', text: 'Pack any essentials (medication, chargers, a change of clothes) in your carry-on in case checked luggage is delayed.' },
  ];
}
