import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function ProcedureModal({ procedure, onClose }) {
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

          {/* CTA */}
          <div className="pt-2">
            <Link to="/booking" onClick={onClose}>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Book a Consultation <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}