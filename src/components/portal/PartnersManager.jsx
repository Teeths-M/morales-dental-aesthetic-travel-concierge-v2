import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Stethoscope, Plane, Hotel, Car, Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react';

const PARTNER_TYPES = [
  { value: 'doctor', label: 'Doctor / Clinic', icon: Stethoscope, color: 'bg-blue-100 text-blue-700' },
  { value: 'travel', label: 'Travel Agency', icon: Plane, color: 'bg-purple-100 text-purple-700' },
  { value: 'hotel', label: 'Recovery Hotel', icon: Hotel, color: 'bg-amber-100 text-amber-700' },
  { value: 'cab', label: 'Cab / Transfer', icon: Car, color: 'bg-green-100 text-green-700' },
  { value: 'other', label: 'Other', icon: Users, color: 'bg-muted text-muted-foreground' },
];

const emptyForm = { name: '', type: 'doctor', email: '', phone: '', contact_person: '', notes: '', is_active: true };

function PartnerForm({ initial = emptyForm, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Partner / Company Name *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Clínica Morales" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type *</Label>
          <Select value={form.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARTNER_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email *</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="partner@example.com" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone / WhatsApp</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+52 555 000 0000" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Contact Person</Label>
          <Input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Dr. García / Mr. López" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any extra details…" />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => onSave(form)}>
          <Check className="w-3.5 h-3.5 mr-1" /> Save Partner
        </Button>
      </div>
    </div>
  );
}

export default function PartnersManager() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const partnerList = await base44.entities.Partner.list('-created_date', 100);
      const travelAgencies = await base44.entities.TravelAgency.list('-created_date', 100);
      const taxiServices = await base44.entities.TaxiService.list('-created_date', 100);
      
      // Convert TravelAgency to Partner format
      const travelPartners = travelAgencies.map(ta => ({
        id: ta.id,
        name: ta.agency_name,
        type: 'travel',
        email: ta.email,
        phone: ta.phone,
        contact_person: '',
        notes: `Regions: ${ta.service_regions?.join(', ')} | Services: ${ta.services_offered?.join(', ')}`,
        is_active: ta.status === 'active',
        created_date: ta.created_date,
        source: 'TravelAgency'
      }));
      
      // Convert TaxiService to Partner format
      const taxiPartners = taxiServices.map(ts => ({
        id: ts.id,
        name: ts.driver_name || ts.company_name,
        type: 'cab',
        email: ts.email,
        phone: ts.phone,
        contact_person: ts.driver_name ? ts.company_name : '',
        notes: `City: ${ts.operating_city} | Vehicles: ${ts.vehicle_types?.join(', ')}`,
        is_active: ts.status === 'active',
        created_date: ts.created_date,
        source: 'TaxiService'
      }));
      
      return [...partnerList, ...travelPartners, ...taxiPartners].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Partner.create(data),
    onSuccess: () => { qc.invalidateQueries(['partners']); setAdding(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Partner.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['partners']); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, source }) => {
      if (source === 'TravelAgency') return base44.entities.TravelAgency.delete(id);
      if (source === 'TaxiService') return base44.entities.TaxiService.delete(id);
      return base44.entities.Partner.delete(id);
    },
    onSuccess: () => qc.invalidateQueries(['partners']),
  });

  const grouped = PARTNER_TYPES.reduce((acc, t) => {
    acc[t.value] = partners.filter(p => p.type === t.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage your network of partners. Their emails will be used when the workflow sends notifications.</p>
        {!adding && (
          <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Partner
          </Button>
        )}
      </div>

      {adding && (
        <PartnerForm onSave={d => createMutation.mutate(d)} onCancel={() => setAdding(false)} />
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Loading partners…</div>
      ) : (
        <div className="space-y-6">
          {PARTNER_TYPES.map(type => {
            const list = grouped[type.value] || [];
            if (list.length === 0 && type.value === 'other') return null;
            const Icon = type.icon;
            return (
              <div key={type.value}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{type.label}</h3>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">No {type.label.toLowerCase()} partners yet.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map(p => (
                      editingId === p.id ? (
                        <PartnerForm
                          key={p.id}
                          initial={p}
                          onSave={d => updateMutation.mutate({ id: p.id, data: d })}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div key={p.id} className="flex items-start justify-between bg-card border border-border rounded-xl px-4 py-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              {!p.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                              {p.contact_person && <span className="text-xs text-muted-foreground">· {p.contact_person}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
                            {p.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{p.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(p.id)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                               variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                               onClick={() => { if (confirm(`Remove ${p.name}?`)) deleteMutation.mutate({ id: p.id, source: p.source }); }}
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}