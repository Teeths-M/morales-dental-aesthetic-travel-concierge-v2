import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar, Plane, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDateConfirmation({ request, onConfirm, onReject, loading }) {
  const [recoveryDaysOverride, setRecoveryDaysOverride] = useState(null);
  const [notes, setNotes] = useState('');
  const [expandAdvanced, setExpandAdvanced] = useState(false);

  if (!request) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending date requests
      </div>
    );
  }

  const procedureDate = new Date(request.procedure_date);
  const arrivalDate = new Date(request.recommended_arrival);
  const departureDate = new Date(request.recommended_departure);

  const handleConfirm = () => {
    onConfirm({
      procedure_date: request.procedure_date,
      arrival_date: request.recommended_arrival,
      departure_date: request.recommended_departure,
      min_recovery_days: recoveryDaysOverride || 5,
      doctor_notes: notes
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Patient & Request Info */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl text-foreground">
              {request.patient_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {request.procedure_type} • {request.patient_email}
            </p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            Awaiting Confirmation
          </Badge>
        </div>

        {/* Proposed Timeline */}
        <div className="space-y-3 mt-6">
          <div className="flex items-start gap-4 p-3 bg-white rounded-lg">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fly In (Prep)</p>
              <p className="font-semibold text-foreground">
                {format(arrivalDate, 'EEEE, MMMM d')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((procedureDate - arrivalDate) / (1000 * 60 * 60 * 24))} days before procedure
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 bg-white rounded-lg">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Procedure</p>
              <p className="font-semibold text-foreground">
                {format(procedureDate, 'EEEE, MMMM d')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 bg-white rounded-lg">
            <Plane className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fly Home (Airline Day)</p>
              <p className="font-semibold text-foreground">
                {format(departureDate, 'EEEE, MMMM d')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((departureDate - procedureDate) / (1000 * 60 * 60 * 24))} days recovery
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly Capacity Info */}
      <Card className="p-4 bg-orange-50 border-orange-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold">Capacity Alert</p>
            <p className="mt-1">If you approve this date, {Math.round((departureDate - arrivalDate) / (1000 * 60 * 60 * 24))} bed-days will be reserved. Current availability: {request.available_capacity} bed-days this month.</p>
          </div>
        </div>
      </Card>

      {/* Doctor Notes */}
      <Card className="p-6">
        <h4 className="font-semibold text-foreground mb-3">Your Notes to Patient</h4>
        <Textarea
          placeholder="Example: 'For your specific case, I recommend arriving on Sunday and departing Thursday to allow 9 days of recovery. This gives optimal time for the initial healing phase.'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-24"
        />
        <p className="text-xs text-muted-foreground mt-2">
          This message will be visible to the patient in their itinerary.
        </p>
      </Card>

      {/* Advanced Options */}
      <Card className="p-6 bg-secondary/20">
        <button
          onClick={() => setExpandAdvanced(!expandAdvanced)}
          className="flex items-center justify-between w-full mb-4 font-semibold text-foreground hover:text-primary transition"
        >
          <span>Advanced Options</span>
          <span className="text-xl">{expandAdvanced ? '−' : '+'}</span>
        </button>

        {expandAdvanced && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Minimum Recovery Days
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                System default: 5 days. Adjust if this patient needs more.
              </p>
              <select
                value={recoveryDaysOverride || 5}
                onChange={(e) => setRecoveryDaysOverride(parseInt(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={5}>5 days (Standard)</option>
                <option value={6}>6 days (Extended)</option>
                <option value={7}>7 days (Extended)</option>
                <option value={10}>10 days (High-risk cases)</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onReject(request.id)}
          disabled={loading}
        >
          Unavailable / Reschedule
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Approve Date
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}