import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Plane, Heart, Check } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isBefore, isAfter } from 'date-fns';

const AIRLINE_DAYS = [0, 1, 4]; // Sunday, Monday, Thursday (0-6 indexing)
const MIN_RECOVERY_DAYS = 5;

export default function SmartProcedureDateSelector({ consultationId, onDateConfirmed }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [capacityInfo, setCapacityInfo] = useState(null);
  const [flightRecommendation, setFlightRecommendation] = useState(null);
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

  const calculateFlightRecommendation = (procedureDate) => {
    // Recommended arrival: day before procedure if procedure is on Mon, else nearest prior flight day
    const procedureDayOfWeek = procedureDate.getDay();
    let arrivalDate;
    
    if (procedureDayOfWeek === 1) { // Monday
      arrivalDate = addDays(procedureDate, -1); // Sunday before
    } else {
      // Find nearest prior flight day
      let checkDate = addDays(procedureDate, -1);
      while (!isAirlineDay(checkDate)) {
        checkDate = addDays(checkDate, -1);
      }
      arrivalDate = checkDate;
    }

    // Recovery departure: first flight day (Sun/Mon/Thu) after procedure + MIN_RECOVERY_DAYS
    let departureDate = addDays(procedureDate, MIN_RECOVERY_DAYS);
    while (!isAirlineDay(departureDate)) {
      departureDate = addDays(departureDate, 1);
    }

    const arrivalDaysFromNow = Math.ceil((arrivalDate - new Date()) / (1000 * 60 * 60 * 24));
    const recoveryDays = Math.ceil((departureDate - procedureDate) / (1000 * 60 * 60 * 24));

    return {
      arrival: arrivalDate,
      procedure: procedureDate,
      departure: departureDate,
      arrivalDaysBeforeProcedure: Math.ceil((procedureDate - arrivalDate) / (1000 * 60 * 60 * 24)),
      recoveryDays,
      totalStayDays: Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24))
    };
  };

  const handleDateSelect = (date) => {
    // Only allow future dates on airline days
    if (isBefore(date, new Date()) || !isAirlineDay(date)) {
      return;
    }

    setSelectedDate(date);
    const recommendation = calculateFlightRecommendation(date);
    setFlightRecommendation(recommendation);
  };

  const handleConfirmWithDoctor = async () => {
    if (!selectedDate) return;

    setConfirmingWithDoctor(true);
    try {
      const res = await base44.functions.invoke('portalHubWorkflowEngine', {
        action: 'request_doctor_date_confirmation',
        consultation_id: consultationId,
        procedure_date: format(selectedDate, 'yyyy-MM-dd'),
        recommended_arrival: format(flightRecommendation.arrival, 'yyyy-MM-dd'),
        recommended_departure: format(flightRecommendation.departure, 'yyyy-MM-dd')
      });

      if (res.data.doctor_approved) {
        setDoctorConfirmed(true);
        onDateConfirmed({
          procedure_date: selectedDate,
          arrival_date: flightRecommendation.arrival,
          departure_date: flightRecommendation.departure,
          recovery_days: flightRecommendation.recoveryDays
        });
      }
    } catch (error) {
      alert('Error confirming with doctor. Please try again.');
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
    <div className="space-y-6">
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

      <Card className="p-6">
        <h3 className="font-display text-xl text-foreground mb-4">Select Your Procedure Date</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Our airline partner flies on Sundays, Mondays, and Thursdays only. The system will recommend optimal arrival and departure dates to maximize your recovery time.
        </p>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
          >
            ← Previous
          </Button>
          <h4 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h4>
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
          >
            Next →
          </Button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
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
                className={`p-2 rounded-lg text-sm font-medium transition-all ${
                  !isCurrentMonth
                    ? 'text-muted-foreground/30 bg-transparent'
                    : isSelected
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : isSelectableAirlineDay
                    ? 'bg-secondary/60 text-foreground hover:bg-primary/20 cursor-pointer'
                    : 'text-muted-foreground bg-muted/30 cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>{format(day, 'd')}</span>
                  {isAirlineAvailable && isCurrentMonth && (
                    <Plane className="w-3 h-3 text-accent" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <Plane className="w-3 h-3 text-accent" />
            <span>Airline flight day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary/60"></div>
            <span>Available procedure date</span>
          </div>
        </div>
      </Card>

      {/* Flight Recommendation */}
      <AnimatePresence>
        {flightRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-start gap-4 mb-6">
                <Heart className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-display text-lg text-blue-900">AI Wellness Recommendation</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Based on flight constraints and recovery science, here's your optimal itinerary:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Arrival */}
                <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Fly In: {format(flightRecommendation.arrival, 'EEEE, MMMM d')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {flightRecommendation.arrivalDaysBeforeProcedure} day{flightRecommendation.arrivalDaysBeforeProcedure !== 1 ? 's' : ''} to rest and prepare
                    </p>
                  </div>
                </div>

                {/* Procedure */}
                <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Procedure: {format(flightRecommendation.procedure, 'EEEE, MMMM d')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getDayName(flightRecommendation.procedure.getDay())} – Optimal timing
                    </p>
                  </div>
                </div>

                {/* Departure */}
                <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-blue-100">
                  <Plane className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Fly Home: {format(flightRecommendation.departure, 'EEEE, MMMM d')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {flightRecommendation.recoveryDays} days of recovery – Rest is essential for best outcomes
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Total stay:</strong> {flightRecommendation.totalStayDays} days | <strong>Recovery window:</strong> {flightRecommendation.recoveryDays} days
                  </p>
                </div>
              </div>
            </Card>

            {/* Confirm with Doctor */}
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                The doctor will review your procedure date and confirm availability. They may adjust recovery recommendations based on your specific needs.
              </p>
              <Button
                size="lg"
                onClick={handleConfirmWithDoctor}
                disabled={confirmingWithDoctor || doctorConfirmed}
                className="w-full gap-2"
              >
                {doctorConfirmed ? (
                  <>
                    <Check className="w-4 h-4" />
                    Doctor Approved ✓
                  </>
                ) : confirmingWithDoctor ? (
                  'Requesting doctor confirmation...'
                ) : (
                  'Request Doctor Confirmation'
                )}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}