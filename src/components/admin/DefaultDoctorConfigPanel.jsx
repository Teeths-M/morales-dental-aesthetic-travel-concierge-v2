import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function DefaultDoctorConfigPanel() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['defaultDoctorConfig'],
    queryFn: () => base44.entities.DefaultDoctorConfig.list(),
  });

  const existing = configs?.[0];

  const [form, setForm] = useState(null);
  const currentForm = form ?? {
    doctor_name: existing?.doctor_name || '',
    doctor_email: existing?.doctor_email || '',
    clinic_name: existing?.clinic_name || '',
    procedure_country: existing?.procedure_country || '',
    treatment_cost: existing?.treatment_cost ?? 60,
    is_active: existing?.is_active ?? true,
  };

  // Sync form when data loads
  React.useEffect(() => {
    if (existing && form === null) {
      setForm({
        doctor_name: existing.doctor_name || '',
        doctor_email: existing.doctor_email || '',
        clinic_name: existing.clinic_name || '',
        procedure_country: existing.procedure_country || '',
        treatment_cost: existing.treatment_cost ?? 60,
        is_active: existing.is_active ?? true,
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, updated_at: new Date().toISOString() };
      if (existing) {
        return base44.entities.DefaultDoctorConfig.update(existing.id, payload);
      }
      return base44.entities.DefaultDoctorConfig.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['defaultDoctorConfig']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => setFormError(e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!currentForm.doctor_name || !currentForm.doctor_email) {
      setFormError('Doctor name and email are required.');
      return;
    }
    mutation.mutate(currentForm);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading config…</div>;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-sm max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Default Doctor Configuration</h3>
          <p className="text-xs text-muted-foreground">Used by the iQ200 pipeline for auto-assignment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Doctor Name *</Label>
            <Input
              value={currentForm.doctor_name}
              onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))}
              placeholder="e.g. Dr. Rossanna"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Doctor Email *</Label>
            <Input
              type="email"
              value={currentForm.doctor_email}
              onChange={e => setForm(f => ({ ...f, doctor_email: e.target.value }))}
              placeholder="doctor@clinic.com"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Clinic Name</Label>
            <Input
              value={currentForm.clinic_name}
              onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))}
              placeholder="e.g. Dental Spa Margarita"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Procedure Country</Label>
            <Input
              value={currentForm.procedure_country}
              onChange={e => setForm(f => ({ ...f, procedure_country: e.target.value }))}
              placeholder="e.g. Venezuela"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Default Treatment Cost (USD)</Label>
            <Input
              type="number"
              value={currentForm.treatment_cost}
              onChange={e => setForm(f => ({ ...f, treatment_cost: parseFloat(e.target.value) || 0 }))}
              className="mt-1 text-sm"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentForm.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              <span className="text-xs font-medium text-foreground">Active (used by pipeline)</span>
            </label>
          </div>
        </div>

        {formError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {formError}
          </p>
        )}

        <Button type="submit" size="sm" disabled={mutation.isPending} className="w-full gap-2">
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved</>
          ) : mutation.isPending ? (
            <><div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4" /> Save Default Doctor Config</>
          )}
        </Button>
      </form>
    </div>
  );
}