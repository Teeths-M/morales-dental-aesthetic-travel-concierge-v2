import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Check, MapPin, Star, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SelectDoctorModal({ procedure, isOpen, onClose, onSelect }) {
  const [doctorPrices, setDoctorPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen || !procedure?.title) return;

    setLoading(true);
    setSelected(null);
    
    const loadDoctors = async () => {
      try {
        const [prices, doctors, specialties, availabilities] = await Promise.all([
          base44.entities.DoctorPricing.filter({ procedure_name: procedure.title }),
          base44.entities.Doctor.list(),
          base44.entities.DoctorSpecialty.list('-created_date', 1000),
          base44.entities.DoctorAvailability.list('-date', 100)
        ]);

        const existingDoctorIds = new Set(doctors.map(d => d.id));
        const validDoctorIds = new Set(specialties.map(s => s.doctor_id));

        // Group availability by doctor
        const availabilityByDoctor = {};
        (availabilities || []).forEach(ava => {
          if (!availabilityByDoctor[ava.doctor_id]) {
            availabilityByDoctor[ava.doctor_id] = [];
          }
          if (ava.is_available && ava.date) {
            availabilityByDoctor[ava.doctor_id].push(ava.date);
          }
        });

        const enriched = (prices || [])
          .filter(p => existingDoctorIds.has(p.doctor_id) && validDoctorIds.has(p.doctor_id))
          .map(p => {
            const doc = doctors.find(d => d.id === p.doctor_id);
            return { 
              ...p, 
              clinic_country: doc?.clinic_country,
              clinic_city: doc?.clinic_city,
              available_dates: availabilityByDoctor[p.doctor_id]?.slice(0, 3) || [] // Show next 3 available dates
            };
          });
        setDoctorPrices(enriched);
        if (enriched.length > 0) setSelected(enriched[0].id);
      } catch (err) {
        console.error('Error loading doctors:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();

    // Subscribe to real-time doctor changes to auto-refresh
    const unsubscribeDoctors = base44.entities.Doctor.subscribe(() => loadDoctors());
    const unsubscribePricing = base44.entities.DoctorPricing.subscribe(() => loadDoctors());
    const unsubscribeSpecialties = base44.entities.DoctorSpecialty.subscribe(() => loadDoctors());
    const unsubscribeAvailability = base44.entities.DoctorAvailability.subscribe(() => loadDoctors());

    return () => {
      unsubscribeDoctors();
      unsubscribePricing();
      unsubscribeSpecialties();
      unsubscribeAvailability();
    };
  }, [isOpen, procedure?.title]);

  const handleSelect = () => {
    const selectedPrice = doctorPrices.find(p => p.id === selected);
    if (selectedPrice) {
      onSelect({
        ...procedure,
        doctor_id: selectedPrice.doctor_id,
        doctor_name: selectedPrice.doctor_name,
        doctor_price_usd: selectedPrice.doctor_price_usd,
        clinic_country: selectedPrice.clinic_country,
        clinic_city: selectedPrice.clinic_city,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Doctor & Price</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading doctors...</div>
          ) : doctorPrices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No doctors available for this procedure</div>
          ) : (
            <>
              {doctorPrices.map(price => (
                <button
                  key={price.id}
                  onClick={() => setSelected(price.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selected === price.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{price.doctor_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{price.clinic_city}, {price.clinic_country}</span>
                      </div>
                      
                      {/* Available Dates */}
                      {price.available_dates && price.available_dates.length > 0 && (
                        <div className="mt-2 flex items-start gap-2">
                          <Calendar className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {price.available_dates.map((date, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100"
                              >
                                {format(new Date(date), 'MMM d')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!price.available_dates || price.available_dates.length === 0) && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-600">
                          <Clock className="w-3 h-3" />
                          <span>Contact for availability</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-primary">${price.doctor_price_usd}</p>
                      {selected === price.id && (
                        <Check className="w-4 h-4 text-primary mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSelect}
            disabled={!selected || loading}
            className="flex-1 bg-accent text-accent-foreground"
          >
            Add to List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}