/**
 * Turns markdown tables into plain, readable lines.
 *
 * M-Care's chat shows plain text (MessageBubble's stripMd), and Talk Mode
 * reads replies aloud (talkMode.js's extractSpeakableText). Neither renders
 * markdown, so a table in a reply used to show as raw "| a | b |" and
 * "|---|---|" rows. This rewrites each table as one line per row, using the
 * header row as labels:
 *
 *   | Season | Months  | Weather |
 *   |--------|---------|---------|
 *   | Dry    | Dec-Apr | Sunny   |
 *
 * becomes "Dry — Months: Dec-Apr, Weather: Sunny".
 *
 * Only a real table changes: a header row containing a pipe, followed
 * directly by a separator row made of pipes and dashes (colons allowed for
 * alignment). Any other text with pipes in it is left exactly as it was.
 */

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function isSeparator(line) {
  return line !== undefined && line.includes('|') && SEPARATOR.test(line);
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map((cell) => cell.trim());
}

function rowToLine(headers, cells) {
  const first = cells[0] || '';
  const pairs = [];
  for (let i = 1; i < cells.length; i += 1) {
    const value = cells[i];
    if (!value) continue;
    const label = headers[i];
    pairs.push(label ? `${label}: ${value}` : value);
  }
  if (!first) return pairs.join(', ');
  return pairs.length ? `${first} — ${pairs.join(', ')}` : first;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function flattenMarkdownTables(text) {
  if (!text || !text.includes('|')) return text;
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const header = lines[i];
    if (!header.includes('|') || !isSeparator(lines[i + 1])) {
      out.push(header);
      i += 1;
      continue;
    }
    const headers = splitRow(header);
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
      rows.push(splitRow(lines[i]));
      i += 1;
    }
    if (rows.length === 0) {
      const heading = headers.filter(Boolean).join(', ');
      if (heading) out.push(heading);
      continue;
    }
    for (const cells of rows) {
      const line = rowToLine(headers, cells);
      if (line) out.push(line);
    }
  }
  return out.join('\n');
}
