import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns';

export default function DoctorAvailabilityCalendar({ doctorEmail, doctorId }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const queryClient = useQueryClient();

  // Fetch doctor availability records
  const { data: availabilityRecords = [] } = useQuery({
    queryKey: ['doctorAvailability', doctorEmail, currentMonth],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const allRecords = await base44.entities.DoctorAvailability.filter({ doctor_email: doctorEmail });
      return allRecords.filter(record => record.date >= start && record.date <= end);
    },
  });

  // Fetch client consultation requests for this doctor
  const { data: consultationRequests = [] } = useQuery({
    queryKey: ['doctorConsultations', doctorId, currentMonth],
    queryFn: async () => {
      const allCases = await base44.entities.Case.filter({ doctor_selected: doctorId });
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      return allCases.filter(c => {
        if (!c.preferred_date) return false;
        const date = parseISO(c.preferred_date);
        return date >= start && date <= end;
      });
    },
  });

  // Mutation to toggle availability
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ date, isAvailable }) => {
      const existingRecord = availabilityRecords.find(r => r.date === format(date, 'yyyy-MM-dd'));

      if (existingRecord) {
        await base44.entities.DoctorAvailability.update(existingRecord.id, {
          is_available: isAvailable
        });
      } else {
        await base44.entities.DoctorAvailability.create({
          doctor_id: doctorId,
          doctor_email: doctorEmail,
          date: format(date, 'yyyy-MM-dd'),
          is_available: isAvailable
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorAvailability'] });
    },
  });

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAvailabilityStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = availabilityRecords.find(r => r.date === dateStr);
    
    if (record) {
      return record.is_available ? 'available' : 'unavailable';
    }
    return 'not-set';
  };

  const getClientRequests = (date) => {
    return consultationRequests.filter(c => isSameDay(parseISO(c.preferred_date), date));
  };

  const handleDateClick = (date) => {
    // Left click - mark as available
    const availability = getAvailabilityStatus(date);
    handleToggleAvailability(true, date);
  };

  const handleToggleAvailability = (isAvailable, dateOverride = null) => {
    const targetDate = dateOverride || selectedDate;
    if (!targetDate) return;
    
    toggleAvailabilityMutation.mutate({ date: targetDate, isAvailable });
    
    // Update selected date if clicking on a different date
    if (dateOverride) {
      setSelectedDate(targetDate);
    } else {
      setSelectedDate(null);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-display">Availability Calendar</CardTitle>
            <p className="text-sm text-muted-foreground">Manage your availability and view client requests</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-500"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-500"></div>
            <span>Client Request</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((date, index) => {
            const availability = getAvailabilityStatus(date);
            const requests = getClientRequests(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleToggleAvailability(false, date);
                }}
                className={`
                  relative min-h-[80px] p-2 rounded-lg border transition-all
                  ${!isSameMonth(date, currentMonth) ? 'bg-muted/50 text-muted-foreground' : 'bg-background'}
                  ${isToday(date) ? 'border-primary border-2' : 'border-border'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}
                  ${availability === 'available' ? 'bg-green-50 border-green-300' : ''}
                  ${availability === 'unavailable' ? 'bg-red-50 border-red-300' : ''}
                  hover:shadow-md
                `}
              >
                <div className="text-right text-sm font-medium mb-1">
                  {format(date, 'd')}
                </div>
                
                {/* Availability Indicator */}
                {availability !== 'not-set' && (
                  <div className="absolute top-2 left-2">
                    {availability === 'available' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                )}

                {/* Client Request Badges */}
                {requests.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {requests.length} request{requests.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Actions */}
        {selectedDate && (
          <div className="sticky bottom-0 left-0 right-0 mt-6 p-4 bg-muted rounded-lg rounded-b-none border-t border-border" id="selected-date-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleToggleAvailability(false)}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark Unavailable
                </Button>
                <Button
                  onClick={() => handleToggleAvailability(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Available
                </Button>
              </div>

              {getClientRequests(selectedDate).length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Client Requests on this date:
                  </p>
                  {getClientRequests(selectedDate).map(request => (
                    <div key={request.id} className="text-sm text-blue-800">
                      <strong>{request.client_name}</strong> - {request.procedures.join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}