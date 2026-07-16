import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle2, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function CapacityGate({ form, _onProceed = null, onMonthChange = null }) {
  const [status, setStatus] = useState(null); // null | loading | open | full
  const [capData, setCapData] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const yearMonth = form.preferred_date
    ? typeof form.preferred_date === 'string'
      ? form.preferred_date.slice(0, 7)
      : new Date(form.preferred_date).toISOString().slice(0, 7)
    : null;

  useEffect(() => {
    if (!yearMonth) return;
    setStatus('loading');
    setJoined(false);
    base44.functions.invoke('capacityCheck', { action: 'check', year_month: yearMonth })
      .then(res => {
        setCapData(res.data);
        setStatus(res.data.is_full ? 'full' : 'open');
      })
      .catch(() => setStatus('open')); // fail open
  }, [yearMonth]);

  const handleJoinWaitingList = async () => {
    setJoining(true);
    await base44.functions.invoke('capacityCheck', {
      action: 'join_waiting_list',
      waiting_list_data: {
        patient_name: form.patient_name,
        email: form.email,
        phone: form.phone || '',
        desired_month: yearMonth,
        procedure_interest: form.procedure_interest,
        consultation_id: '',
      },
    });
    setJoining(false);
    setJoined(true);
  };

  const handleBookNextMonth = () => {
    if (capData?.next_available_month) {
      // Set preferred_date to first day of next available month
      const [y, m] = capData.next_available_month.split('-');
      const newDate = `${y}-${m}-01`;
      onMonthChange(newDate);
    }
  };

  if (!yearMonth) return null;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking availability…
      </div>
    );
  }

  if (status === 'open' && capData) {
    const remaining = capData.remaining;
    const isNearFull = capData.is_near_full;
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
          isNearFull
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}
      >
        {isNearFull ? (
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
        )}
        <div>
          <p className="font-semibold">
            {isNearFull
              ? `⚡ Only ${remaining} slot${remaining === 1 ? '' : 's'} left for ${formatMonth(yearMonth)}!`
              : `${remaining} slot${remaining === 1 ? '' : 's'} available for ${formatMonth(yearMonth)}`}
          </p>
          {isNearFull && (
            <p className="text-xs mt-0.5 text-amber-700">High demand — spots are filling fast.</p>
          )}
        </div>
      </motion.div>
    );
  }

  if (status === 'full') {
    if (joined) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-primary text-center"
        >
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-semibold">You're on the waiting list for {formatMonth(yearMonth)}!</p>
          <p className="text-xs text-muted-foreground mt-1">We'll email you immediately if a slot opens.</p>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800 text-base">
              {formatMonth(yearMonth)} is fully booked
            </p>
            {capData?.next_available_month && (
              <p className="text-red-700 text-xs mt-1">
                Next available: <strong>{formatMonth(capData.next_available_month)}</strong>
                {capData.waiting_list_count > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Users className="w-3 h-3" /> {capData.waiting_list_count} on waiting list
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {capData?.next_available_month && (
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              onClick={handleBookNextMonth}
            >
              Book for {formatMonth(capData.next_available_month)}
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 text-sm"
            disabled={joining}
            onClick={handleJoinWaitingList}
          >
            {joining ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Joining…</> : '+ Join Waiting List'}
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}