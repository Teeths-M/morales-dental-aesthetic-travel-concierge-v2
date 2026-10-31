import { format } from 'date-fns';

/**
 * PilotWaitlistTable — one signup per row on a wide screen, one card per signup
 * on a phone. Same four facts either way: who asked, when, whether they have
 * been invited yet, and which screen they asked from.
 */

const SOURCE_LABEL = {
  landing_hero: 'Home hero',
  landing_greeting: 'Home greeting',
  pilot_page: 'Pilot page',
};

const STATUS_TONE = {
  waiting: '#D4AF37',
  invited: '#10b981',
  joined: '#10b981',
  declined: '#64748b',
};

const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.waiting;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: tone,
        background: `${tone}18`,
        border: `1px solid ${tone}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, 'd MMM yyyy, HH:mm');
}

export default function PilotWaitlistTable({ rows }) {
  return (
    <>
      {/* Phone: stacked cards. A four-column table at 375px is a scrollbar, not a list. */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={`mailto:${row.email}`}
                style={{ fontSize: 13.5, color: '#fff', fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all' }}
              >
                {row.email}
              </a>
              <span style={{ marginLeft: 'auto' }}><StatusPill status={row.status} /></span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
              {formatDate(row.created_date)} · {SOURCE_LABEL[row.source] || row.source}{row.campaign ? ` · ${row.campaign}` : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: a real table, so emails line up and can be scanned down. */}
      <div
        className="hidden md:block"
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2.2fr) 1.1fr 1fr 1.1fr',
            gap: 12,
            padding: '11px 18px',
            borderBottom: `1px solid ${BORDER}`,
            background: 'rgba(255,255,255,0.02)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <span>Email</span>
          <span>Signed up</span>
          <span>Status</span>
          <span>From</span>
        </div>

        {rows.map((row, index) => (
          <div
            key={row.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2.2fr) 1.1fr 1fr 1.1fr',
              gap: 12,
              alignItems: 'center',
              padding: '13px 18px',
              borderTop: index === 0 ? 'none' : `1px solid ${BORDER}`,
            }}
          >
            <a
              href={`mailto:${row.email}`}
              style={{ fontSize: 13.5, color: '#fff', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {row.email}
            </a>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{formatDate(row.created_date)}</span>
            <span><StatusPill status={row.status} /></span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
              {SOURCE_LABEL[row.source] || row.source}{row.campaign ? ` · ${row.campaign}` : ''}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}