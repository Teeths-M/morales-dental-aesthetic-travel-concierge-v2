import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { RISK_TEXT_COLOR } from '@/components/procedures/riskDisplay';

export default function ProcedureModal({ procedure, riskSummary, onClose, onBook }) {
  const [doctorPrices, setDoctorPrices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!procedure?.title) return;
    
    setLoading(true);
    Promise.all([
      base44.entities.DoctorPricing.filter({ procedure_name: procedure.title }),
      base44.entities.Doctor.list()
    ])
      .then(([prices, doctors]) => {
        const enrichedPrices = (prices || []).map(p => {
          const doc = doctors.find(d => d.id === p.doctor_id);
          return { ...p, clinic_country: doc?.clinic_country };
        });
        setDoctorPrices(enrichedPrices);
      })
      .finally(() => setLoading(false));
  }, [procedure?.title]);

  if (!procedure) return null;

  return (
    <Dialog open={!!procedure} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-accent/10 text-accent border-0 text-[11px] font-semibold uppercase tracking-wider">
              {procedure.tag}
            </Badge>
          </div>
          <DialogTitle className="font-display text-2xl text-foreground leading-tight">
            {procedure.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Overview */}
          <p className="text-sm text-muted-foreground leading-relaxed">{procedure.desc}</p>

          {/* Stats Row */}
          {procedure.duration && (
            <div className="flex flex-wrap gap-4 py-3 border-y border-border">
              {procedure.duration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium text-foreground">{procedure.duration}</span>
                </div>
              )}
              {procedure.recovery && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">Recovery:</span>
                  <span className="font-medium text-foreground">{procedure.recovery}</span>
                </div>
              )}
            </div>
          )}

          {/* What to expect */}
          {procedure.whatToExpect?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">What to Expect</h4>
              <div className="space-y-1.5">
                {procedure.whatToExpect.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {procedure.benefits?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Key Benefits</h4>
              <div className="space-y-1.5">
                {procedure.benefits.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Pricing */}
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-3">Loading prices...</div>
          ) : doctorPrices.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Available Doctors & Pricing</h4>
              <div className="space-y-2">
                {doctorPrices.map(price => (
                  <div key={price.id} className="p-3 bg-secondary/40 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{price.doctor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {price.clinic_country || 'Location TBD'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-semibold text-primary">${price.doctor_price_usd}</p>
                        <p className="text-xs text-muted-foreground">{price.specialty_expertise_level}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

           {/* Procedure Info Box */}
           <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
             <h4 className="text-sm font-semibold text-teal-900">Procedure Details</h4>
             <div className="space-y-2 text-xs text-teal-800">
               <div className="flex justify-between">
                 <span className="font-medium">Complexity Level:</span>
                 <span>{procedure.complexity || 'Moderate'}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-medium">Downtime:</span>
                 <span>{procedure.downtime || procedure.recovery}</span>
               </div>
               {procedure.material_options && (
                 <div className="flex justify-between">
                   <span className="font-medium">Material Options:</span>
                   <span>{procedure.material_options.length} available</span>
                 </div>
               )}
               {/* Only shown once an admin has curated real risk data for
                   this procedure — no fabricated default risk level. */}
               {riskSummary?.risk_level && (
                 <div className="flex justify-between">
                   <span className="font-medium">Risk Level:</span>
                   <span className={`font-semibold flex items-center gap-1 ${RISK_TEXT_COLOR[riskSummary.risk_level] || RISK_TEXT_COLOR.Medium}`}>
                     <ShieldAlert className="w-3.5 h-3.5" />{riskSummary.risk_level}
                   </span>
                 </div>
               )}
             </div>
             {riskSummary?.risk_factors?.length > 0 && (
               <p className="text-[11px] text-teal-700 pt-1 border-t border-teal-200">
                 May carry added risk for: {riskSummary.risk_factors.slice(0, 2).join(', ')}. Your doctor will review your health background before confirming.
               </p>
             )}
           </div>

           {/* CTA */}
           <div className="pt-2">
             {onBook ? (
               <Button
                 onClick={() => onBook(procedure)}
                 className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
               >
                 Book a Consultation <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             ) : (
               <Link to="/intake" onClick={onClose}>
                 <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                   Book a Consultation <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               </Link>
             )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}