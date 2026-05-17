import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, DollarSign, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function DoctorConfirmationPanel({ workflow }) {
  const qc = useQueryClient();
  const [quotedPrice, setQuotedPrice] = useState(workflow.doctor_quoted_price || '');
  const [notes, setNotes] = useState(workflow.doctor_notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localStatus, setLocalStatus] = useState(workflow.doctor_status);
  const [localQuotedPrice, setLocalQuotedPrice] = useState(workflow.doctor_quoted_price);
  const [localNotes, setLocalNotes] = useState(workflow.doctor_notes);
  const [localDate, setLocalDate] = useState(workflow.doctor_confirmed_date);

  const isConfirmed = localStatus === 'confirmed';
  const isUnavailable = localStatus === 'unavailable';

  const handleConfirm = async (status) => {
    setSaving(true);
    const price = status === 'confirmed' ? Number(quotedPrice) : null;
    const date = new Date().toISOString();

    // 1. Save doctor confirmation to WorkflowEvent
    await base44.entities.WorkflowEvent.update(workflow.id, {
      doctor_status: status,
      doctor_quoted_price: price,
      doctor_notes: notes,
      doctor_confirmed_date: date,
      stage: status === 'confirmed' ? 'travel' : 'doctor',
      last_update_summary: status === 'confirmed'
        ? `Doctor confirmed. Quoted price: $${quotedPrice}. ${notes ? 'Notes: ' + notes : ''}`
        : `Doctor marked as unavailable. ${notes ? 'Notes: ' + notes : ''}`,
    });

    // 2. If confirmed, call backend to notify all partners and patient
    if (status === 'confirmed') {
      await base44.functions.invoke('onDoctorConfirmed', {
        workflow_id: workflow.id,
        quoted_price: price,
        notes,
      });
    }

    // Update local state immediately so UI reflects the change without waiting for refetch
    setLocalStatus(status);
    setLocalQuotedPrice(price);
    setLocalNotes(notes);
    setLocalDate(date);
    qc.invalidateQueries({ queryKey: ['portal_workflows'] });
    setSaved(true);
    setSaving(false);
  };

  const handleReset = async () => {
    await base44.entities.WorkflowEvent.update(workflow.id, { doctor_status: 'notified' });
    setLocalStatus('notified');
    setSaved(false);
    qc.invalidateQueries({ queryKey: ['portal_workflows'] });
  };

  if (isConfirmed || isUnavailable) {
    return (
      <div className={`rounded-lg p-4 flex items-start gap-3 ${isConfirmed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {isConfirmed
          ? <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          : <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`text-sm font-semibold ${isConfirmed ? 'text-green-800' : 'text-red-800'}`}>
            {isConfirmed ? 'Doctor Confirmed' : 'Doctor Unavailable'}
          </p>
          {isConfirmed && localQuotedPrice && (
            <p className="text-sm text-green-700 mt-1">
              Quoted Price: <span className="font-bold">${Number(localQuotedPrice).toLocaleString()}</span>
            </p>
          )}
          {localNotes && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{localNotes}"</p>
          )}
          {localDate && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(localDate).toLocaleString()}
            </p>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-xs h-6 px-2"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-800 uppercase">Doctor Response — Log Manually</p>
      <p className="text-xs text-blue-600">The doctor replied by email. Enter their confirmation details here.</p>

      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Quoted Price (USD)</Label>
        <Input
          type="number"
          placeholder="e.g. 500"
          value={quotedPrice}
          onChange={e => setQuotedPrice(e.target.value)}
          className="h-8 text-sm bg-white"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Doctor Notes / Message</Label>
        <Textarea
          placeholder="Enter what the doctor said in their email reply…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="text-sm bg-white"
        />
      </div>

      {saved && <p className="text-xs text-green-600 font-semibold">✓ Saved successfully!</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white flex-1"
          onClick={() => handleConfirm('confirmed')}
          disabled={saving || !quotedPrice}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Confirm & Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => handleConfirm('unavailable')}
          disabled={saving}
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Unavailable
        </Button>
      </div>
    </div>
  );
}