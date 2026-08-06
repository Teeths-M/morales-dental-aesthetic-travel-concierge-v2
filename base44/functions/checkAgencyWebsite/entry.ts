import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Tool 3: check_website
// Fetches the agency's website to confirm it's live, captures the HTTP status,
// the <title>, and whether the connection is HTTPS. The M-Care agent narrates
// this conversationally ("✅ Website globalmed.com — Live and responding").
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let url = String(body?.url || '').trim();
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const ssl_valid = url.startsWith('https://');
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);

    let status_code = 0;
    let page_title = null;
    let is_live = false;
    let err = null;

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
      err = e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed');
    }
    clearTimeout(timeout);

    return Response.json({
      is_live,
      status_code,
      page_title,
      ssl_valid,
      has_contact_info: null,
      error: err
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}