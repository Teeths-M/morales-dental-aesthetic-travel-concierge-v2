import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check, X, DollarSign, TrendingUp } from 'lucide-react';

const CATEGORIES = [
  { id: 'Dental', label: 'Dental', emoji: '🦷' },
  { id: 'Aesthetic', label: 'Aesthetic', emoji: '✨' },
  { id: 'Wellness', label: 'Wellness', emoji: '🌿' },
  { id: 'Cardiology', label: 'Cardiology', emoji: '❤️' },
  { id: 'Orthopedics', label: 'Orthopedics', emoji: '🦴' },
];

function PricingForm({ doctor, procedures, allowedProcedureNames = [], initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { procedure_id: '', doctor_price_usd: '', specialty_expertise_level: 'intermediate' });
  const [category, setCategory] = useState('Dental');

  const selectedProc = procedures.find(p => p.id === form.procedure_id);
  // Filter procedures by category AND by doctor's specialties (if adding new)
  const filteredProcs = procedures.filter(p => 
    p.category === category && 
    (initial ? true : allowedProcedureNames.includes(p.procedure_name))
  );

  const handleSave = () => {
    if (!form.procedure_id || !form.doctor_price_usd) {
      alert('Please select a procedure and enter a price');
      return;
    }
    const procName = selectedProc?.procedure_name || procedures.find(p => p.id === form.procedure_id)?.procedure_name;
    onSave({
      ...form,
      doctor_id: doctor.id,
      doctor_name: doctor.full_name,
      procedure_name: procName,
      doctor_price_usd: parseFloat(form.doctor_price_usd)
    });
  };

  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Procedure *</Label>
          <Select value={form.procedure_id} onValueChange={v => setForm(f => ({ ...f, procedure_id: v }))}>
            <SelectTrigger><SelectValue placeholder={filteredProcs.length === 0 ? `No procedures in ${category}` : 'Select procedure'} /></SelectTrigger>
            <SelectContent>
              {filteredProcs.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">No procedures found in {category}</div>
              ) : (
                filteredProcs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.procedure_name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Price (USD) *</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="5000"
              min="0"
              step="100"
              value={form.doctor_price_usd}
              onChange={e => setForm(f => ({ ...f, doctor_price_usd: e.target.value }))}
              className="text-right"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expertise Level</Label>
          <Select value={form.specialty_expertise_level} onValueChange={v => setForm(f => ({ ...f, specialty_expertise_level: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSave}>
          <Check className="w-3.5 h-3.5 mr-1" /> Save Price
        </Button>
      </div>
    </div>
  );
}

export default function PricingCatalogManager() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors_for_pricing'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 100),
  });

  const { data: doctorPrices = [], isLoading } = useQuery({
    queryKey: ['doctor_prices'],
    queryFn: () => base44.entities.DoctorPricing.list('-created_date', 200),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures_for_pricing'],
    queryFn: async () => {
      const procPricing = await base44.entities.ProcedurePricing.list('-created_date', 500);
      const masterProcs = await base44.entities.MasterProcedure.list('-created_date', 500);
      
      return procPricing.map(p => {
        const masterProc = masterProcs.find(mp => mp.en_name === p.procedure_name);
        return {
          id: p.id,
          procedure_name: p.procedure_name,
          category: p.category,
          master_procedure_id: masterProc?.id,
        };
      });
    },
  });

  const { data: doctorSpecialties = [] } = useQuery({
    queryKey: ['doctor_specialties', selectedDoctor?.id],
    queryFn: () => selectedDoctor ? base44.entities.DoctorSpecialty.filter({ doctor_id: selectedDoctor.id }, '-created_date', 200) : Promise.resolve([]),
    enabled: !!selectedDoctor,
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.DoctorPricing.create(data),
    onSuccess: (result) => {
      console.log('Price saved successfully:', result);
      qc.invalidateQueries({ queryKey: ['doctor_prices'] });
      setAdding(false);
    },
    onError: (error) => {
      console.error('Failed to save price:', error);
      alert(`Failed to save: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DoctorPricing.update(id, data),
    onSuccess: (result) => {
      console.log('Price updated successfully:', result);
      qc.invalidateQueries({ queryKey: ['doctor_prices'] });
      setEditingId(null);
    },
    onError: (error) => {
      console.error('Failed to update price:', error);
      alert(`Failed to update: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.DoctorPricing.delete(id),
    onSuccess: () => {
      console.log('Price deleted successfully');
      qc.invalidateQueries({ queryKey: ['doctor_prices'] });
    },
    onError: (error) => {
      console.error('Failed to delete price:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: id => base44.entities.Doctor.delete(id),
    onSuccess: () => {
      console.log('Doctor deleted successfully');
      qc.invalidateQueries({ queryKey: ['doctors_for_pricing'] });
      qc.invalidateQueries({ queryKey: ['doctor_prices'] });
    },
    onError: (error) => {
      console.error('Failed to delete doctor:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  });

  // Group prices by doctor
  const groupedByDoctor = doctors.map(doc => ({
    ...doc,
    prices: doctorPrices.filter(p => p.doctor_id === doc.id)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Pricing Catalog</h2>
        <p className="text-sm text-muted-foreground">
          Manage prices for each doctor's procedures. This unified catalog powers patient quotes and marketplace pricing.
        </p>
      </div>

      {/* Doctor Selector */}
      {!selectedDoctor ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Select a doctor to manage their procedure prices:</p>
          <div className="grid md:grid-cols-2 gap-3">
            {groupedByDoctor.map(doc => (
              <Card
                key={doc.id}
                className="p-4 hover:bg-secondary/50 transition-all border-2 hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedDoctor(doc)}>
                    <p className="font-semibold text-foreground">{doc.full_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.clinic_name || doc.clinic_country}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">{doc.prices.length} prices set</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={doc.status === 'active' ? 'default' : 'outline'}>
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${doc.full_name}? This will remove the doctor and all their pricing data.`)) {
                          deleteDoctorMutation.mutate(doc.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Back button & header */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)} className="mb-3">
                ← Back to Doctors
              </Button>
              <h3 className="text-xl font-semibold text-foreground">{selectedDoctor.full_name}</h3>
              <p className="text-sm text-muted-foreground">{selectedDoctor.clinic_name} • {selectedDoctor.clinic_country}</p>
            </div>
            {!adding && (
              <Button size="sm" className="gap-1.5 bg-accent" onClick={() => setAdding(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Price
              </Button>
            )}
          </div>

          {adding && (
            <PricingForm
              doctor={selectedDoctor}
              procedures={procedures}
              allowedProcedureNames={doctorSpecialties.map(ds => ds.procedure_name)}
              onSave={d => createMutation.mutate(d)}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* Prices list */}
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading prices…</div>
          ) : (
            <div className="space-y-2">
              {selectedDoctor.prices.length === 0 ? (
                <Card className="p-6 text-center bg-secondary/30 border-dashed">
                  <p className="text-sm text-muted-foreground">No prices set yet. Add one to get started.</p>
                </Card>
              ) : (
                selectedDoctor.prices.map(price => (
                  editingId === price.id ? (
                    <PricingForm
                      key={price.id}
                      doctor={selectedDoctor}
                      procedures={procedures}
                      allowedProcedureNames={doctorSpecialties.map(ds => ds.procedure_name)}
                      initial={price}
                      onSave={d => updateMutation.mutate({ id: price.id, data: d })}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <Card key={price.id} className="p-4 flex items-center justify-between hover:bg-secondary/40 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-medium text-foreground">{price.procedure_name}</p>
                          <Badge variant="outline" className="text-[10px]">{price.specialty_expertise_level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {price.approved_by_admin && '✓ Approved by admin'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">${price.doctor_price_usd}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(price.id)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm(`Remove ${price.procedure_name}?`)) {
                                deleteMutation.mutate(price.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}