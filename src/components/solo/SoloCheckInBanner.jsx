import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, CheckCircle2, AlertTriangle, MapPin, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function SoloCheckInBanner() {
  const [pendingCheckIn, setPendingCheckIn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('getSoloCheckInStatus');
        if (res.data?.overdue_check_ins?.length > 0) {
          setPendingCheckIn(res.data.overdue_check_ins[0]);
        } else if (res.data?.upcoming_check_ins?.length > 0) {
          setPendingCheckIn(res.data.upcoming_check_ins[0]);
        }
      } catch (e) {
        console.error('Failed to load solo check-in status:', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleAcknowledge = async () => {
    if (!pendingCheckIn) return;
    setLoading(true);
    try {
      await base44.functions.invoke('acknowledgeSoloCheckIn', {
        case_id: pendingCheckIn.case_id,
        response_method: 'app',
        location_lat: location?.lat,
        location_lng: location?.lng,
      });
      toast({
        title: '✅ Check-in complete',
        description: 'Your safety has been confirmed. Next check-in in 12 hours.',
      });
      setPendingCheckIn(null);
    } catch (e) {
      toast({
        title: '❌ Failed to acknowledge',
        description: e.response?.data?.error || 'Please try again',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (!pendingCheckIn) return null;

  const isOverdue = new Date(pendingCheckIn.scheduled_time) < new Date();
  const scheduledTime = new Date(pendingCheckIn.scheduled_time);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`rounded-2xl p-4 border-2 shadow-sm ${
          isOverdue
            ? 'bg-red-50 border-red-300'
            : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            {isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
            ) : (
              <Shield className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${isOverdue ? 'text-red-800' : 'text-emerald-800'}`}>
              {isOverdue ? '🚨 Safety Check-In Overdue' : '🛡️ Solo Traveler Check-In'}
            </p>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-700' : 'text-emerald-700'}`}>
              {isOverdue
                ? `You missed your check-in scheduled for ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Please confirm immediately.`
                : `Scheduled for ${scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. Tap to confirm you're safe.`}
            </p>

            {!isOverdue && location && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-600">
                <MapPin className="w-3 h-3" />
                <span>Location will be shared: {location.lat.toFixed(2)}, {location.lng.toFixed(2)}</span>
              </div>
            )}

            <Button
              onClick={handleAcknowledge}
              disabled={loading}
              className={`mt-3 w-full sm:w-auto ${
                isOverdue
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } gap-2 text-xs h-9`}
            >
              {loading ? (
                <span className="flex items-center gap-2">Processing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isOverdue ? "✅ I'm Safe (Confirm Now)" : "✅ I'm Safe"}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}