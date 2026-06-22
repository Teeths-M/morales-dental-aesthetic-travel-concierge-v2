import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

export default function DoctorSpecialtiesPreview({ doctor, specialties, procedures, onSave }) {
  const [editingId, setEditingId] = useState(null);
  const [prices, setPrices] = useState({});

  const handleSavePrice = (specialty, price) => {
    if (!price || parseFloat(price) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const proc = procedures.find(p => p.procedure_name === specialty.procedure_name);

    onSave({
      doctor_id: doctor.id,
      doctor_name: doctor.full_name,
      procedure_id: proc?.id || specialty.procedure_name,
      procedure_name: specialty.procedure_name,
      doctor_price_usd: parseFloat(price),
      specialty_expertise_level: specialty.expertise_level || 'intermediate'
    });

    setEditingId(null);
    setPrices(p => {
      const newPrices = { ...p };
      delete newPrices[specialty.id];
      return newPrices;
    });
  };

  if (specialties.length === 0) {
    return (
      <Card className="p-6 text-center bg-secondary/30 border-dashed">
        <p className="text-sm text-muted-foreground">No specialties selected during signup.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Specialties from Signup</h4>
      {specialties.filter(s => !doctor.prices?.some(p => p.procedure_name === s.procedure_name)).map(specialty => {
        const proc = procedures.find(p => p.procedure_name === specialty.procedure_name);
        const isEditing = editingId === specialty.id;

        return (
          <Card key={specialty.id} className="p-4 flex items-center justify-between hover:bg-secondary/40 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-foreground">{specialty.procedure_name}</p>
                <Badge variant="outline" className="text-[10px]">{specialty.expertise_level || 'intermediate'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{specialty.category || ''}</p>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="100"
                  autoFocus
                  className="w-24 text-right"
                  value={prices[specialty.id] || ''}
                  onChange={e => setPrices(p => ({ ...p, [specialty.id]: e.target.value }))}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleSavePrice(specialty, prices[specialty.id])}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingId(null);
                    setPrices(p => {
                      const newPrices = { ...p };
                      delete newPrices[specialty.id];
                      return newPrices;
                    });
                  }}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(specialty.id)}
                className="flex-shrink-0"
              >
                Set Price
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}