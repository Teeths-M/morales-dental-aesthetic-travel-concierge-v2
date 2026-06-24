import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function SoloCheckInBanner() {
  const [pendingCheckIn, setPendingCheckIn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [locStatus, setLocStatus] = useState('idle'); // 'idle'|'acquiring'|'gps'|'ip_geo'|'none'
  const locRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.functions.invoke('getSoloCheckInStatus')
      .then(res => {
        const data = res.data;
        if (data?.overdue_check_ins?.length > 0) setPendingCheckIn(data.overdue_check_ins[0]);
        else if (data?.upcoming_check_ins?.length > 0) setPendingCheckIn(data.upcoming_check_ins[0]);
      })
      .catch(() => {});
  }, []);

  // Pre-acquire location when there's a pending check-in
  useEffect(() => {
    if (!pendingCheckIn) return;
    setLocStatus('acquiring');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          locRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'gps' };
          setLocStatus('gps');
        },
        () => {
          base44.functions.invoke('getGeolocationAndCurrency', {})
            .then(res => {
              const d = res?.data;
              if (d?.latitude) {
                locRef.current = { lat: d.latitude, lng: d.longitude, city: d.city, country: d.country, country_code: d.country_code, region: d.region, timezone: d.timezone, source: 'ip_geo' };
                setLocStatus('ip_geo');
              } else {
                setLocStatus('none');
              }
            })
            .catch(() => setLocStatus('none'));
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setLocStatus('none');
    }
  }, [pendingCheckIn]);

  const handleAcknowledge = async () => {
    if (!pendingCheckIn) return;
    setLoading(true);
    const loc = locRef.current;
    try {
      await base44.functions.invoke('acknowledgeSoloCheckIn', {
        case_id: pendingCheckIn.case_id,
        response_method: 'app',
        location_lat: loc?.lat ?? null,
        location_lng: loc?.lng ?? null,
        accuracy_meters: loc?.accuracy ?? null,
        location_source: loc?.source ?? 'gps',
        country: loc?.country ?? null,
        country_code: loc?.country_code ?? null,
        city: loc?.city ?? null,
        region: loc?.region ?? null,
        timezone: loc?.timezone ?? null,
      });
      setConfirmed(true);
      setPendingCheckIn(null);
    } catch {
      toast({ title: 'Failed to acknowledge', description: 'Please try again.', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (confirmed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-4 border-2 bg-emerald-50 border-emerald-400 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">✅ You're Marked Safe</p>
            <p className="text-emerald-700 text-xs mt-0.5">Your location and safety status have been recorded. Next check-in in 12 hours.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!pendingCheckIn) {
    // Just show static "active" info banner — no overdue check-in
    return null;
  }

  const isOverdue = new Date(pendingCheckIn.scheduled_time) < new Date();
  const scheduledTime = new Date(pendingCheckIn.scheduled_time);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className={`rounded-2xl p-4 border-2 shadow-sm mb-4 ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            {isOverdue
              ? <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              : <Shield className="w-5 h-5 text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isOverdue ? 'text-red-800' : 'text-emerald-800'}`}>
              {isOverdue ? '🚨 Safety Check-In Overdue' : '🛡️ Solo Traveler Check-In Due'}
            </p>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-700' : 'text-emerald-700'}`}>
              {isOverdue
                ? `Missed: ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Confirm immediately to stop escalation.`
                : `Due: ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
            </p>

            {locStatus === 'gps' && locRef.current && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600">
                <MapPin className="w-3 h-3" />
                GPS ready · {locRef.current.lat?.toFixed(4)}, {locRef.current.lng?.toFixed(4)}
              </div>
            )}
            {locStatus === 'ip_geo' && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-600">
                <Globe className="w-3 h-3" />
                Approximate network location
              </div>
            )}
            {(locStatus === 'none' || locStatus === 'ip_geo') && (
              <button
                type="button"
                onClick={() => {
                  locRef.current = { lat: 32.5149, lng: -117.0382, accuracy: 50, source: 'manual', place_label: 'Tijuana, MX (demo override)' };
                  setLocStatus('gps');
                }}
                className="mt-1 text-[10px] underline text-slate-400 hover:text-slate-600"
              >
                Use demo location override
              </button>
            )}

            <Button onClick={handleAcknowledge} disabled={loading}
              className={`mt-3 w-full sm:w-auto ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2 text-xs h-9`}>
              {loading ? 'Recording...' : <><CheckCircle2 className="w-3.5 h-3.5" />I'm Safe — Confirm Now</>}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}