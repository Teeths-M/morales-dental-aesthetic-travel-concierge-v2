import React from 'react';
import { MapPin, Shield, Clock, Users, Zap, CheckCircle } from 'lucide-react';
import TrustBadge from './TrustBadge';

export default function SecurityAgencyCard({ agency }) {
  const initials = (agency.agency_name || 'SA')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-semibold text-lg">{initials}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{agency.agency_name}</h3>
            {agency.contact_person && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Contact: {agency.contact_person}</p>
            )}
            <div className="mt-1.5">
              <TrustBadge status={agency.verification_status} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-3">
        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[agency.city, agency.country].filter(Boolean).join(', ') || 'Location not specified'}</span>
        </div>

        {/* Years in operation */}
        {agency.years_in_operation > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{agency.years_in_operation} years in operation</span>
          </div>
        )}

        {/* Personnel */}
        {agency.personnel_count && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{agency.personnel_count} personnel</span>
          </div>
        )}

        {/* Response time */}
        {agency.response_time_minutes > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{agency.response_time_minutes} min avg. response time</span>
          </div>
        )}

        {/* Armored vehicles badge */}
        {agency.has_armored_vehicles && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
            <Shield className="w-3 h-3" />
            Armored Vehicle Available
          </div>
        )}

        {/* Services */}
        {agency.services_offered?.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Services</p>
            <div className="flex flex-wrap gap-1">
              {agency.services_offered.slice(0, 4).map(s => (
                <span key={s} className="text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
              {agency.services_offered.length > 4 && (
                <span className="text-[10px] font-medium text-muted-foreground px-1">+{agency.services_offered.length - 4} more</span>
              )}
            </div>
          </div>
        )}

        {/* Background types */}
        {agency.background_types?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agency.background_types.slice(0, 3).map(b => (
              <span key={b} className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <a
          href="/emergency"
          className="block w-full text-center bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-700 transition-all"
        >
          Request Security Services
        </a>
      </div>
    </div>
  );
}