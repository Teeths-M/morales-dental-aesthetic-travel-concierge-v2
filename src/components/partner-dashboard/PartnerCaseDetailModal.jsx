import React from 'react';
import { X, MapPin, Clock, Phone, AlertTriangle } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';

const GOLD = '#D4AF37';

/**
 * Shared "View" detail popup for a case card on the taxi and travel-agency
 * partner dashboards. Both cards used to link to /case/:id — a route that
 * has never existed, so "View" 404'd for every partner. There's no separate
 * detail data behind that dead link either: everything here is already
 * present in the same case object the card itself renders, already scoped
 * to this partner by the query/entity RLS that fetched it — this just shows
 * the full record instead of the compact card's subset, with no new fetch.
 */
export default function PartnerCaseDetailModal({ caseRecord, onClose, actionLabel = null, onAction = () => {} }) {
  const ref = useModalA11y({ isOpen: !!caseRecord, onClose });
  if (!caseRecord) return null;
  const c = caseRecord;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-case-detail-title"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,11,22,0.85)', backdropFilter: 'blur(6px)', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ maxWidth: 420, width: '100%', background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 20, padding: 24 }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="partner-case-detail-title" className="text-lg font-semibold text-white">{c.client_name || 'Client'}</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              {c.status?.replace(/-/g, ' ') || 'In Progress'}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2" style={{ color: '#94a3b8' }}>
            <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
            {c.procedure_country || c.destination_country || 'Destination TBC'}
          </div>
          <div className="flex items-center gap-2" style={{ color: '#94a3b8' }}>
            <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
            Departs: {c.departure_date
              ? new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'TBC'}
          </div>
          {c.client_phone && (
            <a href={`tel:${c.client_phone}`} className="flex items-center gap-2 text-emerald-400">
              <Phone className="w-3.5 h-3.5" />
              {c.client_phone}
            </a>
          )}
          <p style={{ color: '#64748b' }}>
            {(c.procedures || []).join(', ') || 'Procedure TBC'}
          </p>
          {c.special_requirements && (
            <p className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24' }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {c.special_requirements}
            </p>
          )}
        </div>

        {actionLabel && (
          <button
            onClick={onAction}
            className="w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: GOLD, color: '#060B16' }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
