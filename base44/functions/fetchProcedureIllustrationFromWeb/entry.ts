import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── fetchProcedureIllustrationFromWeb ─────────────────────────────────────────
// Tier 3 fallback for ProcedureMediaCard (src/components/mcare-agent/
// MessageBubble.jsx). When neither the static procedure catalog (tier 1) nor
// the live ProcedureKnowledge lookup via getProcedureIllustration (tier 2)
// has a curated diagram, this fetches a real image from the open web via
// Tavily's image search and returns it. The returned URL is third-party and
// is shown in chat with an honest "sourced from the web — not Morales-
// curated" caption; it is NEVER persisted to ProcedureKnowledge.image_url
// (third-party URLs can be ephemeral/hotlink-blocked and re-hosting raises
// licensing issues). Caching of web hits stays session-level inside the chat
// component, so the same procedure asked again in one conversation doesn't
// re-hit Tavily. Permanent illustrations still come only from admin curation
// or generateProcedureIllustrations.
//
// requireAuth: false mirrors getProcedureIllustration — the chat (including
// anonymous M-Care sessions) must be able to resolve a {{media:...}} token
// without a login wall. A modest rate limit guards the public endpoint.

const bodySchema = strictObject({
  query: Fields.shortText(120),
});

Deno.serve(createHandler(async ({ body }) => {
  const { query } = await body();
  const procedure = (query || '').toString().trim();
  if (!procedure) return err('query (procedure name) is required');

  const apiKey = Deno.env.get('TAVILY_API_KEY');
  if (!apiKey) {
    // Honest: web discovery isn't configured, not a fabricated "found".
    return ok({ found: false });
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `${procedure} medical procedure illustration diagram`,
        max_results: 5,
        search_depth: 'basic',
        include_images: true,
        include_image_descriptions: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return ok({ found: false });

    const data: any = await res.json();

    // Tavily returns `images` as URL strings when include_images is set, or
    // as { url, description } objects when include_image_descriptions is set.
    // Accept only direct image-host URLs — skip data URIs, SVGs, and anything
    // that isn't a real raster image we can safely render in an <img> tag.
    const rawImages: any[] = Array.isArray(data?.images) ? data.images : [];
    const imageUrls: string[] = [];
    for (const img of rawImages) {
      const url = typeof img === 'string' ? img : (img?.url || '');
      if (typeof url === 'string' && /\.(png|jpe?g|webp)(\?|$)/i.test(url)) {
        imageUrls.push(url);
      }
    }

    if (imageUrls.length === 0) return ok({ found: false });

    // Best-effort title from the first text result, if any — purely a label,
    // never a claim about the image's accuracy or provenance beyond "web".
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const title = String(results[0]?.title || procedure);

    return ok({ found: true, image_url: imageUrls[0], title });
  } catch {
    // Any network/parse failure is an honest miss, never a fabricated hit.
    return ok({ found: false });
  }
}, { name: 'fetchProcedureIllustrationFromWeb', requireAuth: false, bodySchema, rateLimit: { max: 20, windowSeconds: 60 } }));