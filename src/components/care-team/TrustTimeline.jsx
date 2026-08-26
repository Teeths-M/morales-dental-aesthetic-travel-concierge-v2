import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * TrustTimeline — the spec's TrustTimeline module. Redacted chronological
 * verification-evidence history, fed by getProviderTrustTimeline. Never
 * shows raw reviewer identity or admin notes — those stay admin-only.
 */
export default function TrustTimeline({ doctorId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!doctorId) return;
    base44.functions.invoke('getProviderTrustTimeline', { doctor_id: doctorId })
      .then((res) => { if (!cancelled) setData(res?.data || res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctorId]);

  if (loading) return <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading…</div>;
  if (!data || !data.timeline?.length) {
    return <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>No verification history to show yet.</div>;
  }

  return (
    <div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {data.timeline.map((e, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', minWidth: 84, flexShrink: 0 }}>
              {new Date(e.at).toLocaleDateString()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{e.detail}</span>
          </li>
        ))}
      </ul>
      {data.concern_summary && (
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>{data.concern_summary}</p>
      )}
    </div>
  );
}
