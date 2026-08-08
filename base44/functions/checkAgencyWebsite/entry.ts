import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Tool 3: check_website
// Fetches the agency's website to confirm it's live, captures the HTTP status,
// the <title>, and whether the connection is HTTPS. The M-Care agent narrates
// this conversationally ("✅ Website globalmed.com — Live and responding").
Deno.serve(createHandler(async ({ body }) => {
    const payload = await body();
    let url = String(payload?.url || '').trim();
    if (!url) return err('url is required');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const ssl_valid = url.startsWith('https://');
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);

    let status_code = 0;
    let page_title = null;
    let is_live = false;
    let fetchError = null;

    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Morales-MCare/1.0 (+https://morales.com)' }
      });
      status_code = res.status;
      is_live = res.ok;
      const html = await res.text();
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      page_title = m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null;
    } catch (e) {
      fetchError = e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed');
    }
    clearTimeout(timeout);

    return ok({
      is_live,
      status_code,
      page_title,
      ssl_valid,
      has_contact_info: null,
      error: fetchError
    });
}, { name: 'checkAgencyWebsite' }));