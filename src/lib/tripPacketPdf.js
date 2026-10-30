/**
 * printPacketSheet — the one form of the packet a person asks for.
 *
 * A hospital handover is a piece of paper, so this opens a print-ready sheet
 * rather than a download. It is built from the same stored version the message
 * body came from, so the sheet and the text can never disagree about an address.
 * No library: a printable page is the browser's job, and a PDF dependency is one
 * more thing that can fail at the moment it is needed.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadPacketPdf(packet, pairs) {
  const version = packet?.version || 1;
  const rows = (pairs || [])
    .filter((p) => p.value)
    .map(
      (p) => `
        <tr>
          <th>${escapeHtml(p.label)}</th>
          <td>${escapeHtml(p.value)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>M-Care emergency packet v${escapeHtml(version)}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; color: #060B16; }
    header { border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-bottom: 18px; }
    h1 { font-size: 18px; margin: 0; letter-spacing: 0.02em; }
    .meta { font-size: 11px; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
         color: #666; width: 34%; padding: 7px 0; vertical-align: top; border-bottom: 1px solid #eee; }
    td { font-size: 13px; padding: 7px 0; border-bottom: 1px solid #eee; }
    footer { margin-top: 22px; font-size: 10px; color: #777; line-height: 1.5; }
  </style>
</head>
<body>
  <header>
    <h1>M-CARE EMERGENCY PACKET</h1>
    <div class="meta">Version ${escapeHtml(version)} · address first · prepared at booking</div>
  </header>
  <table>${rows}</table>
  <footer>
    Never given to police. A care-team human reads the address down the line.
    This sheet is only as current as the version number above.
  </footer>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}