import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, PlusCircle, FileText } from 'lucide-react';

export default function ProcedureRequestForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    procedure_name: '',
    procedure_name_es: '',
    procedure_name_fr: '',
    procedure_name_pt: '',
    procedure_name_de: '',
    category: '',
    category_emoji: '🏥',
    description: '',
    specialty: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.procedure_name || !form.category || !form.description || !form.specialty) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const doctor = await base44.entities.Doctor.filter({ email: (await base44.auth.me()).email });
      if (!doctor || doctor.length === 0) {
        toast.error('Doctor profile not found');
        setLoading(false);
        return;
      }

      const d = doctor[0];
      await base44.entities.ProcedureRequest.create({
        doctor_id: d.id,
        doctor_name: d.full_name,
        doctor_email: d.email,
        ...form,
        status: 'pending',
        submitted_date: new Date().toISOString(),
      });

      toast.success('Procedure request submitted for review!');
      onSuccess?.();
    } catch (e) {
      console.error('Failed to submit request:', e);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <PlusCircle className="w-4 h-4 text-emerald-700" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Request New Procedure</h3>
          <p className="text-xs text-slate-500">Add a procedure to the Master catalog</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Procedure Name (English) *</Label>
          <Input
            value={form.procedure_name}
            onChange={(e) => update('procedure_name', e.target.value)}
            placeholder="e.g., Neck Lift"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => update('category', v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Facial">💆 Facial</SelectItem>
              <SelectItem value="Breast">🌸 Breast</SelectItem>
              <SelectItem value="Body">💪 Body</SelectItem>
              <SelectItem value="Dental">🦷 Dental</SelectItem>
              <SelectItem value="Wellness">🌿 Wellness</SelectItem>
              <SelectItem value="Other">🏥 Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Spanish Name</Label>
          <Input
            value={form.procedure_name_es}
            onChange={(e) => update('procedure_name_es', e.target.value)}
            placeholder="e.g., Lifting de Cuello"
            className="mt-1"
          />
        </div>
        <div>
          <Label>French Name</Label>
          <Input
            value={form.procedure_name_fr}
            onChange={(e) => update('procedure_name_fr', e.target.value)}
            placeholder="e.g., Lifting du Cou"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Portuguese Name</Label>
          <Input
            value={form.procedure_name_pt}
            onChange={(e) => update('procedure_name_pt', e.target.value)}
            placeholder="e.g., Lifting de Pescoço"
            className="mt-1"
          />
        </div>
        <div>
          <Label>German Name</Label>
          <Input
            value={form.procedure_name_de}
            onChange={(e) => update('procedure_name_de', e.target.value)}
            placeholder="e.g., Halsstraffung"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe the procedure, typical use cases, patient criteria..."
          className="mt-1 min-h-[100px]"
        />
      </div>

      <div>
        <Label>Required Specialty *</Label>
        <Input
          value={form.specialty}
          onChange={(e) => update('specialty', e.target.value)}
          placeholder="e.g., Plastic Surgery, Oral & Maxillofacial Surgery"
          className="mt-1"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Submit for Review
          </>
        )}
      </Button>

      <p className="text-[10px] text-slate-400 text-center mt-2">
        Admin will review your request within 2-3 business days
      </p>
    </div>
  );
}