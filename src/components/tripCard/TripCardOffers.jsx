import React from 'react';
import { Clock, MapPin, CheckCircle2, AlertTriangle, Ban, UserRound } from 'lucide-react';

const STATUS_TONE = {
  OFFERED: 'text-accent',
  ACCEPTED: 'text-primary',
  DECLINED: 'text-muted-foreground',
  EXPIRED: 'text-muted-foreground',
  WITHDRAWN: 'text-muted-foreground',
  QUEUED: 'text-muted-foreground',
};

function Row({ label, value, tone = 'text-foreground' }) {
  if (!value) return null;
  return (
    <p className="text-[11.5px] leading-relaxed">
      <span className="text-muted-foreground">{label}: </span>
      <span className={tone}>{value}</span>
    </p>
  );
}

/**
 * TripCardOffers — every driver who was asked, in order.
 *
 * The point of this table is that a no-show is VISIBLE: an accepting driver who
 * missed his arrival deadline stays here, marked missed and superseded, rather
 * than being quietly replaced by the next name.
 */
export default function TripCardOffers({ offers }) {
  if (!offers.length) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        No driver has been offered this job yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {offers.map((o) => {
        const missed = !!o.arrival_deadline_missed_at;
        return (
          <div key={o.id} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                #{o.attempt_number || '—'}
              </span>
              <span className="text-sm font-semibold text-foreground">{o.display_name}</span>
              <span className={`text-[11px] font-semibold ${STATUS_TONE[o.status] || 'text-foreground'}`}>
                {o.status}
              </span>
              {missed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  <AlertTriangle className="w-3 h-3" /> missed arrival deadline
                </span>
              )}
              {o.arrived_at && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="w-3 h-3" /> arrived
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <Row label="Offered" value={o.offered_at ? new Date(o.offered_at).toLocaleString() : null} />
              <Row label="Accepted" value={o.accepted_at ? new Date(o.accepted_at).toLocaleString() : null} />
              <Row
                label="Quoted ETA"
                value={o.accepted_eta_seconds
                  ? `${Math.round(o.accepted_eta_seconds / 60)} min + ${Math.round((o.arrival_buffer_seconds || 0) / 60)} min buffer`
                  : (o.accepted_at ? 'not declared — buffer only' : null)}
              />
              <Row
                label="Arrival deadline"
                value={o.arrival_deadline_at ? new Date(o.arrival_deadline_at).toLocaleString() : null}
                tone={missed ? 'text-destructive' : 'text-foreground'}
              />
              <Row
                label="Arrived (GPS)"
                value={o.arrived_at
                  ? `${new Date(o.arrived_at).toLocaleString()} · ${o.gps_checkin_distance_m != null ? `${o.gps_checkin_distance_m} m from destination` : 'validated'}`
                  : (o.gps_checkin_distance_m != null ? `rejected — ${o.gps_checkin_distance_m} m away` : null)}
                tone={o.arrived_at ? 'text-primary' : 'text-destructive'}
              />
              <Row
                label="In person"
                value={o.in_person_outcome
                  ? `${o.in_person_outcome.replace(/_/g, ' ')}${o.in_person_note ? ` — ${o.in_person_note}` : ''}`
                  : null}
              />
              <Row
                label="Recall fee"
                value={o.assignment_fee_amount
                  ? `$${o.assignment_fee_amount} recorded (${o.assignment_fee_status})`
                  : null}
                tone="text-accent"
              />
              {o.superseded_reason && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Ban className="w-3 h-3" />
                  {o.superseded_reason.replace(/_/g, ' ')} · acceptance kept in the record
                </p>
              )}
              {o.driver_brief?.destination && (
                <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="mt-0.5 w-3 h-3 shrink-0" />
                  <span>
                    Sent to <span className="text-foreground">{o.driver_brief.destination}</span>
                    {Array.isArray(o.driver_brief.addresses) && o.driver_brief.addresses.length > 1
                      ? ` · ${o.driver_brief.addresses.length} addresses given, each labelled by reporter`
                      : ''}
                  </span>
                </p>
              )}
              {o.responder_phone && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <UserRound className="w-3 h-3" /> {o.responder_phone}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <p className="flex items-center gap-1.5 px-1 text-[10.5px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        Arrival is only ever recorded by a GPS check-in that lands inside the confirmed destination's radius.
      </p>
    </div>
  );
}