import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plane, Check } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isBefore, isAfter } from 'date-fns';

const AIRLINE_DAYS = [0, 1, 4]; // Sunday, Monday, Thursday (0-6 indexing)
const MIN_RECOVERY_DAYS = 5;

export default function SmartProcedureDateSelector({ consultationId, onDateConfirmed }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [capacityInfo, setCapacityInfo] = useState(null);
  const [showUrgencyPopup, setShowUrgencyPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingWithDoctor, setConfirmingWithDoctor] = useState(false);
  const [doctorConfirmed, setDoctorConfirmed] = useState(false);

  useEffect(() => {
    fetchCapacityInfo();
  }, [currentMonth]);

  const fetchCapacityInfo = async () => {
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await base44.functions.invoke('capacityCheck', {
        action: 'get_capacity',
        year_month: monthStr
      });
      setCapacityInfo(res.data);
      
      // Show urgency pop-up if low on slots
      if (res.data.available_slots <= 12) {
        setShowUrgencyPopup(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching capacity:', error);
      setLoading(false);
    }
  };

  const isAirlineDay = (date) => {
    return AIRLINE_DAYS.includes(date.getDay());
  };

  const getDayName = (day) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };



  const handleDateSelect = (date) => {
    // Only allow future dates on airline days
    if (isBefore(date, new Date()) || !isAirlineDay(date)) {
      return;
    }

    setSelectedDate(date);
  };

  const handleConfirmWithDoctor = async () => {
    if (!selectedDate) return;

    setConfirmingWithDoctor(true);
    try {
      setDoctorConfirmed(true);
      onDateConfirmed({
        procedure_date: selectedDate
      });
    } catch (error) {
      alert('Error confirming date. Please try again.');
      console.error(error);
    } finally {
      setConfirmingWithDoctor(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Urgency Pop-up */}
      <AnimatePresence>
        {showUrgencyPopup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-accent/10 to-orange-50 border border-accent/50 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Only {capacityInfo?.available_slots} spots remain for {format(currentMonth, 'MMMM')}</p>
              <p className="text-sm text-muted-foreground mt-1">Book soon to secure your preferred date.</p>
            </div>
            <button
              onClick={() => setShowUrgencyPopup(false)}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-6 bg-white border border-border shadow-md">
        <div className="mb-6">
          <h3 className="font-display text-2xl text-foreground mb-1">Select Your Procedure Date</h3>
          <p className="text-xs text-muted-foreground">Choose from available airline flight days</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
            className="h-8 px-2"
          >
            ←
          </Button>
          <h4 className="font-display text-lg text-foreground">{format(currentMonth, 'MMMM yyyy')}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
            className="h-8 px-2"
          >
            →
          </Button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {days.map(day => {
            const isSelectableAirlineDay = isAirlineDay(day) && !isBefore(day, new Date());
            const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isAirlineAvailable = isAirlineDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <motion.button
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => handleDateSelect(day)}
                disabled={!isSelectableAirlineDay}
                whileHover={isSelectableAirlineDay ? { scale: 1.05 } : {}}
                className={`aspect-square rounded-lg font-semibold text-sm transition-all flex items-center justify-center ${
                  !isCurrentMonth
                    ? 'text-muted-foreground/20 bg-transparent'
                    : isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isSelectableAirlineDay
                    ? 'bg-white border border-border hover:border-primary/50 cursor-pointer'
                    : 'text-muted-foreground/30 bg-muted/20 cursor-not-allowed'
                }`}
              >
                {format(day, 'd')}
              </motion.button>
            );
          })}
        </div>

      </Card>

      {/* Confirm Selection Button */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            onClick={() => setSelectedDate(null)}
            className="flex-1"
          >
            Clear Selection
          </Button>
          <Button
            size="lg"
            onClick={handleConfirmWithDoctor}
            disabled={confirmingWithDoctor || doctorConfirmed}
            className="flex-1 gap-2"
          >
            {doctorConfirmed ? (
              <>
                <Check className="w-4 h-4" />
                Confirmed ✓
              </>
            ) : confirmingWithDoctor ? (
              'Confirming...'
            ) : (
              'Confirm Date'
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}