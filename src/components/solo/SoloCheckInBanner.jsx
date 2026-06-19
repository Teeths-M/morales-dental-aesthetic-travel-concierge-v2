import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, CheckCircle2, AlertTriangle, MapPin, Globe } from 'lucide-react';
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

  // Pre-acquire location quietly in background
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
          // GPS denied — try IP geo
          base44.functions.invoke('getGeolocationAndCurrency', {})
            .then(res => {
              const d = res?.data;
              if (d?.latitude) {
                locRef.current = { lat: d.latitude, lng: d.longitude, city: d.city, country: d.country, country_code: d.country_code, region: d.region, timezone: d.timezone, source: 'ip_geo' };
                setLocStatus('ip_geo');
              } else if (d?.city || d?.country) {
                locRef.current = { city: d.city, country: d.country, country_code: d.country_code, region: d.region, timezone: d.timezone, source: 'ip_geo' };
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
    } catch (e) {
      toast({ title: 'Failed to acknowledge', description: 'Please try again.', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (confirmed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-5 border-2 bg-emerald-50 border-emerald-400 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-emerald-800 text-base">✅ You're Marked Safe!</p>
            <p className="text-emerald-700 text-sm mt-0.5">Your location and safety status have been recorded. Next check-in in 12 hours.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!pendingCheckIn) return null;

  const isOverdue = new Date(pendingCheckIn.scheduled_time) < new Date();
  const scheduledTime = new Date(pendingCheckIn.scheduled_time);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className={`rounded-2xl p-4 border-2 shadow-sm ${isOverdue ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            {isOverdue
              ? <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              : <Shield className="w-5 h-5 text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${isOverdue ? 'text-red-800' : 'text-emerald-800'}`}>
              {isOverdue ? '🚨 Safety Check-In Overdue' : '🛡️ Solo Traveler Check-In'}
            </p>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-700' : 'text-emerald-700'}`}>
              {isOverdue
                ? `Missed check-in for ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Confirm immediately.`
                : `Scheduled ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Tap to confirm you're safe.`}
            </p>

            {/* Location status */}
            {locStatus === 'gps' && locRef.current && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-emerald-600">
                <MapPin className="w-3 h-3" />
                GPS ready · {locRef.current.lat?.toFixed(4)}, {locRef.current.lng?.toFixed(4)}
                {locRef.current.accuracy != null && ` ±${Math.round(locRef.current.accuracy)}m`}
              </div>
            )}
            {locStatus === 'ip_geo' && locRef.current && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-600">
                <Globe className="w-3 h-3" />
                Approximate location · {[locRef.current.city, locRef.current.country].filter(Boolean).join(', ') || 'Network location'}
              </div>
            )}
            {locStatus === 'none' && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                Location unavailable — check-in will still be recorded
              </div>
            )}

            <Button onClick={handleAcknowledge} disabled={loading}
              className={`mt-3 w-full sm:w-auto ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2 text-xs h-9`}>
              {loading
                ? 'Recording...'
                : <><CheckCircle2 className="w-3.5 h-3.5" />{isOverdue ? "✅ I'm Safe (Confirm Now)" : "✅ I'm Safe"}</>}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}