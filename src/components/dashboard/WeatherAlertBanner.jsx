// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  CloudLightning, Thermometer, Wind, Droplets,
  ChevronDown, ChevronUp, Users, Stethoscope, Car, User
} from 'lucide-react';

const SEV_CONFIG = {
  clear:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', icon: '✅', label: 'All Clear',       color: '#34d399', textColor: '#065f46' },
  advisory: { bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.35)', icon: '🌤',  label: 'Weather Advisory', color: '#D4AF37', textColor: '#92400e' },
  warning:  { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.4)',   icon: '⚠️',  label: 'Weather Warning',  color: '#ca8a04', textColor: '#78350f' },
  critical: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.4)',   icon: '🚨',  label: 'Critical Alert',   color: '#ef4444', textColor: '#7f1d1d' },
};

const PARTY_ICONS = {
  patient:   { icon: User,        label: 'You',        color: '#D4AF37' },
  companion: { icon: Users,       label: 'Companion',  color: '#34d399' },
  clinic:    { icon: Stethoscope, label: 'Clinic',     color: '#93c5fd' },
  driver:    { icon: Car,         label: 'Driver',     color: '#a78bfa' },
};

export default function WeatherAlertBanner({ caseId, country, procedureType }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather-alert', caseId || country],
    queryFn: () => base44.functions.invoke('checkWeatherAlerts', {
      action: caseId ? 'scan' : 'demo',
      case_id: caseId || undefined,
      country: country || undefined,
      procedure_type: procedureType || undefined,
    }),
    staleTime: 30 * 60 * 1000, // 30 min — weather doesn't change every second
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/50 px-4 py-3 flex items-center gap-3 animate-pulse">
        <div className="w-4 h-4 bg-border/50 rounded-full" />
        <div className="w-48 h-3 bg-border/50 rounded" />
      </div>
    );
  }

  if (isError || !data?.alert) return null;

  const alert = data.alert;
  const sev = SEV_CONFIG[alert.severity] || SEV_CONFIG.advisory;
  const isClear = alert.severity === 'clear';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ background: sev.bg, borderColor: sev.border }}
    >
      {/* Header row */}
      <button
        onClick={() => !isClear && setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <span className="text-lg leading-none flex-shrink-0">{sev.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sev.color }}>
              {sev.label}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground font-medium">{alert.country}</span>
            {alert.recovery_day > 0 && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">Recovery day {alert.recovery_day}</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {alert.conditions.join(' · ')}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Thermometer className="w-3 h-3" />
            {alert.current.temp_c}°C
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wind className="w-3 h-3" />
            {alert.current.wind_kmh} km/h
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="w-3 h-3" />
            {alert.current.humidity_pct}%
          </div>
        </div>

        {!isClear && (
          <span className="text-muted-foreground flex-shrink-0 ml-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        )}
      </button>

      {/* 4-party action plan */}
      <AnimatePresence>
        {expanded && !isClear && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: sev.border }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                M has prepared your 4-party action plan
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(PARTY_ICONS).map(([key, { icon: Icon, label, color }]) => {
                  const actions = alert.action_plan?.[key] || [];
                  if (!actions.length) return null;
                  return (
                    <div key={key} className="rounded-lg bg-background/60 border border-border/30 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                      </div>
                      <ul className="space-y-1">
                        {actions.map((action, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-border flex-shrink-0 mt-0.5">→</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* 7-day forecast note */}
              {alert.forecast_7d?.max_temp_c > alert.current.temp_c + 2 && (
                <p className="mt-3 text-[11px] text-muted-foreground bg-background/40 rounded-lg px-3 py-2 border border-border/20">
                  <CloudLightning className="w-3 h-3 inline mr-1.5 text-amber-400" />
                  7-day forecast: up to <strong>{alert.forecast_7d.max_temp_c}°C</strong> · {alert.forecast_7d.worst_condition}
                </p>
              )}

              <p className="mt-2 text-[10px] text-muted-foreground/60 text-right">
                Updated {new Date(alert.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {alert.source === 'demo' ? ' · Demo mode' : ' · Open-Meteo'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
