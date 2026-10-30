/**
 * The trip card's four screens, as server-rendered HTML.
 *
 * No React, no hydration, no framework, no analytics, no tracking pixel, no
 * third-party script, no cookie, no localStorage. A stranger with a phone at
 * 2% battery and one bar of signal gets a complete page in one response.
 *
 * The ONLY script anywhere is the optional inline geolocation helper on the
 * location screen, and it degrades honestly: with JS off, the form still
 * submits and the server records that no coordinate arrived, rather than
 * pretending a location was shared.
 */

import { escapeHtml, isRtl } from './tripCard.ts';
import { cardCopy, fillName, EN } from './tripCardCopy.ts';

const GOLD = '#D4AF37';
const BG = '#060B16';
const INK = '#F5F3EC';
const SOFT = 'rgba(245,243,236,0.60)';
const LINE = 'rgba(212,175,55,0.22)';
const LOGO = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/a604a57e2_logo.jpeg';

function shell(params: {
  lang: string;
  title: string;
  body: string;
  refreshSeconds?: number;
  script?: string;
  noindex?: boolean;
}): string {
  const dir = isRtl(params.lang) ? 'rtl' : 'ltr';
  const refresh = params.refreshSeconds
    ? `<meta http-equiv="refresh" content="${params.refreshSeconds}">`
    : '';
  const script = params.script ? `<script>${params.script}</script>` : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(params.lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${BG}">
<title>${escapeHtml(params.title)}</title>
${refresh}
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; }
  body {
    background: ${BG};
    color: ${INK};
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(28px, env(safe-area-inset-top)) 22px max(28px, env(safe-area-inset-bottom));
    -webkit-font-smoothing: antialiased;
  }
  main { width: 100%; max-width: 380px; }
  .mark {
    width: 62px; height: 62px; border-radius: 50%;
    display: block; margin: 0 auto 26px;
    object-fit: cover;
    box-shadow: 0 0 0 1px ${LINE}, 0 8px 28px rgba(0,0,0,0.45);
  }
  h1 {
    font-size: 27px; line-height: 1.18; font-weight: 600;
    letter-spacing: -0.022em; margin: 0 0 6px; text-align: center;
  }
  h1 .en { display: block; font-size: 16px; font-weight: 500; color: ${SOFT}; margin-top: 7px; letter-spacing: -0.01em; }
  p { margin: 0; }
  .lead { font-size: 15.5px; line-height: 1.5; color: ${INK}; text-align: center; }
  .lead .en { display: block; font-size: 13px; color: ${SOFT}; margin-top: 4px; }
  .rule { height: 1px; background: ${LINE}; margin: 26px 0; border: 0; }
  .cta {
    display: block; width: 100%; border: 0; cursor: pointer;
    background: ${GOLD}; color: #060B16;
    font: 700 16.5px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif;
    border-radius: 13px; padding: 19px 18px; margin-top: 26px;
    text-align: center; text-decoration: none;
    box-shadow: 0 6px 24px rgba(212,175,55,0.28);
  }
  .cta:active { transform: scale(0.985); }
  .cta .en { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.62; margin-top: 5px; letter-spacing: 0.01em; }
  .call {
    display: block; text-align: center; text-decoration: none;
    color: ${GOLD}; font-size: 15px; font-weight: 600;
    margin-top: 20px; padding: 14px;
    border: 1px solid ${LINE}; border-radius: 13px;
  }
  .call .en { display: block; font-size: 11.5px; font-weight: 500; color: ${SOFT}; margin-top: 5px; }
  .ghost {
    display: block; width: 100%; border: 1px solid ${LINE}; background: transparent;
    color: ${SOFT}; font: 500 14.5px/1 -apple-system, Arial, sans-serif;
    border-radius: 13px; padding: 17px; margin-top: 10px; cursor: pointer;
  }
  fieldset { border: 0; padding: 0; margin: 0; }
  input[type="text"] {
    width: 100%; background: rgba(245,243,236,0.05);
    border: 1px solid ${LINE}; border-radius: 13px;
    color: ${INK}; font-size: 16px; padding: 16px 15px; margin-bottom: 10px;
  }
  input[type="text"]::placeholder { color: rgba(245,243,236,0.34); }
  .ref {
    text-align: center; font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.16em; text-transform: uppercase; color: ${SOFT}; margin-bottom: 20px;
  }
  .ref b { color: ${GOLD}; display: block; margin-top: 7px; letter-spacing: 0.2em; font-size: 13px; }
  .status { text-align: center; }
  .status .local { font-size: 18px; font-weight: 600; line-height: 1.4; }
  .status .en { display: block; font-size: 13px; color: ${SOFT}; margin-top: 7px; font-weight: 400; }
  .fine { margin-top: 24px; text-align: center; font-size: 12.5px; line-height: 1.55; color: ${SOFT}; }
  .fine .en { display: block; margin-top: 3px; font-size: 11.5px; opacity: 0.82; }
  .flag { color: ${GOLD}; font-size: 13.5px; text-align: center; margin-top: 14px; }
</style>
</head>
<body>
<main>
${params.body}
</main>
${script}
</body>
</html>`;
}

function mark(): string {
  return `<img class="mark" src="${LOGO}" alt="M-Care" width="62" height="62">`;
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

export function renderHelpPage(params: {
  lang: string;
  name: string;
  actionUrl: string;
  token: string;
  emergencyNumber: string;
  emergencyLabel?: string | null;
}): string {
  const c = cardCopy(params.lang);
  const name = escapeHtml(params.name);
  const tel = String(params.emergencyNumber || '').replace(/[^0-9+]/g, '');

  const body = `
${mark()}
<h1>${escapeHtml(fillName(c.needsHelp, params.name))}<span class="en">${escapeHtml(fillName(EN.needsHelp, params.name))}</span></h1>
<hr class="rule">
<p class="lead">${escapeHtml(c.line)}<span class="en">${escapeHtml(EN.line)}</span></p>

<form method="POST" action="${escapeAttr(params.actionUrl)}">
  <input type="hidden" name="t" value="${escapeAttr(params.token)}">
  <input type="hidden" name="kind" value="tap">
  <button class="cta" type="submit">${escapeHtml(c.cta)}<span class="en">${escapeHtml(EN.cta)}</span></button>
</form>

<a class="call" href="tel:${escapeAttr(tel)}">${escapeHtml(c.call)} ${escapeHtml(params.emergencyNumber)}<span class="en">${escapeHtml(EN.call)} ${escapeHtml(params.emergencyNumber)}</span></a>
`;

  return shell({ lang: params.lang, title: `${name} — M-Care`, body });
}

export function renderLocationPage(params: {
  lang: string;
  actionUrl: string;
  token: string;
  reference: string;
  emergencyNumber: string;
  alreadySent?: boolean;
}): string {
  const c = cardCopy(params.lang);
  const tel = String(params.emergencyNumber || '').replace(/[^0-9+]/g, '');

  const body = `
${mark()}
<p class="ref">${escapeHtml(c.ref)}<b>${escapeHtml(params.reference)}</b></p>

<div class="status">
  <p class="local">${escapeHtml(c.reassure)}</p>
  <span class="en">${escapeHtml(EN.reassure)}</span>
</div>

<hr class="rule">

<p class="lead">${escapeHtml(c.askWhere)}<span class="en">${escapeHtml(EN.askWhere)}</span></p>

<form method="POST" action="${escapeAttr(params.actionUrl)}" id="gpsForm">
  <input type="hidden" name="t" value="${escapeAttr(params.token)}">
  <input type="hidden" name="kind" value="gps">
  <input type="hidden" name="lat" id="lat" value="">
  <input type="hidden" name="lng" id="lng" value="">
  <input type="hidden" name="accuracy" id="acc" value="">
  <button class="cta" type="submit" id="gpsBtn">${escapeHtml(c.share)}<span class="en">${escapeHtml(EN.share)}</span></button>
</form>

<form method="POST" action="${escapeAttr(params.actionUrl)}">
  <input type="hidden" name="t" value="${escapeAttr(params.token)}">
  <input type="hidden" name="kind" value="address">
  <label for="addr" class="lead" style="display:block;margin:22px 0 9px;">${escapeHtml(c.address)}</label>
  <input id="addr" type="text" name="address" inputmode="text" autocomplete="off" maxlength="240" placeholder="${escapeAttr(c.addressPh)}">
  <button class="ghost" type="submit" style="border-color:${GOLD};color:${GOLD};">${escapeHtml(c.send)}</button>
</form>

<form method="POST" action="${escapeAttr(params.actionUrl)}">
  <input type="hidden" name="t" value="${escapeAttr(params.token)}">
  <input type="hidden" name="kind" value="skip">
  <button class="ghost" type="submit">${escapeHtml(c.skip)}</button>
</form>

<p class="fine">${params.alreadySent ? escapeHtml(c.sent) : ''}</p>

<a class="call" href="tel:${escapeAttr(tel)}">${escapeHtml(c.call)} ${escapeHtml(params.emergencyNumber)}<span class="en">${escapeHtml(EN.call)} ${escapeHtml(params.emergencyNumber)}</span></a>
`;

  // The one inline script in the whole surface. It only fills hidden fields;
  // if it never runs, the form still submits and the server records honestly
  // that no coordinate arrived.
  const script = `
(function(){
  var f=document.getElementById('gpsForm'),b=document.getElementById('gpsBtn');
  if(!f||!window.navigator||!navigator.geolocation)return;
  b.addEventListener('click',function(e){
    if(document.getElementById('lat').value)return;
    e.preventDefault();
    b.disabled=true;
    var done=false;
    var finish=function(){if(done)return;done=true;f.submit();};
    setTimeout(finish,9000);
    navigator.geolocation.getCurrentPosition(function(p){
      document.getElementById('lat').value=p.coords.latitude;
      document.getElementById('lng').value=p.coords.longitude;
      document.getElementById('acc').value=Math.round(p.coords.accuracy||0);
      finish();
    },function(){finish();},{enableHighAccuracy:true,timeout:8000,maximumAge:0});
  },false);
})();`;

  return shell({ lang: params.lang, title: `${c.ref} ${params.reference}`, body, script });
}

export function renderStatusPage(params: {
  lang: string;
  token: string;
  pageUrl: string;
  reference: string;
  emergencyNumber: string;
  statusKey: 'waiting' | 'assigned' | 'arrived' | 'unresolved' | 'closed';
  terminal: boolean;
  refresh: boolean;
}): string {
  const c = cardCopy(params.lang);
  const tel = String(params.emergencyNumber || '').replace(/[^0-9+]/g, '');

  const local = params.statusKey === 'closed' ? c.closed : c[params.statusKey];
  const english = params.statusKey === 'closed' ? EN.closed : EN[params.statusKey];

  const body = `
${mark()}
<p class="ref">${escapeHtml(c.ref)}<b>${escapeHtml(params.reference)}</b></p>

<div class="status">
  <p class="local">${escapeHtml(local)}</p>
  <span class="en">${escapeHtml(english)}</span>
</div>

${params.terminal ? `<p class="flag">${escapeHtml(c.held)}<span class="en" style="display:block;margin-top:5px;font-size:12px;color:${SOFT};">${escapeHtml(EN.held)}</span></p>` : ''}

<a class="call" href="tel:${escapeAttr(tel)}">${escapeHtml(c.call)} ${escapeHtml(params.emergencyNumber)}<span class="en">${escapeHtml(EN.call)} ${escapeHtml(params.emergencyNumber)}</span></a>

<p class="fine">${escapeHtml(c.continues)}<span class="en">${escapeHtml(EN.continues)}</span></p>
`;

  return shell({
    lang: params.lang,
    title: `${c.ref} ${params.reference}`,
    body,
    refreshSeconds: params.refresh ? 6 : undefined,
  });
}

/**
 * The neutral page. Deliberately indistinguishable for invalid, expired and
 * revoked cards: the caller learns nothing about why, and the only thing on
 * offer is the country's own emergency number.
 */
export function renderNeutralPage(params: {
  lang: string;
  emergencyNumber: string;
  reason: 'invalid' | 'expired' | 'throttled';
}): string {
  const c = cardCopy(params.lang);
  const tel = String(params.emergencyNumber || '').replace(/[^0-9+]/g, '');

  const body = `
${mark()}
<h1>${escapeHtml(c.invalidTitle)}<span class="en">${escapeHtml(EN.invalidTitle)}</span></h1>
<hr class="rule">
<p class="lead">${escapeHtml(c.invalidNote)}<span class="en">${escapeHtml(EN.invalidNote)}</span></p>

${tel ? `<a class="call" href="tel:${escapeAttr(tel)}">${escapeHtml(c.call)} ${escapeHtml(params.emergencyNumber)}<span class="en">${escapeHtml(EN.call)} ${escapeHtml(params.emergencyNumber)}</span></a>` : ''}
`;

  return shell({ lang: params.lang, title: 'M-Care', body });
}

/**
 * Every public response carries the same headers: no-store so a shared phone
 * never re-serves a stale receipt, no-referrer so the token cannot leak to any
 * third party through a Referer header, noindex so the card never enters a
 * search index.
 */
export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}