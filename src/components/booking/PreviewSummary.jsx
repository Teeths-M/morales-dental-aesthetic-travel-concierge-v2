import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { CheckCircle2, AlertCircle, Calendar, User, Weight } from 'lucide-react';
import { motion } from 'framer-motion';

function kgToLbs(kg) {
  return Math.round(kg * 2.20462);
}

export default function PreviewSummary({ isOpen, form, onEdit, onSubmit, isSubmitting }) {
  const { items } = useCart();

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Consultation Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Procedures */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-lg">🏥</span> Procedures ({items.length})
            </h4>
            <div className="space-y-2 bg-secondary/30 rounded-lg p-3">
              {items.map(item => (
                <div key={item.name} className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.preparation_notes && (
                      <p className="text-xs text-muted-foreground mt-1">{item.preparation_notes}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded ml-2">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Patient Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Patient Information
            </h4>
            <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium text-foreground">{form.patient_name || '—'}</span>
              </div>
              {form.weight && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Weight:</span>
                  <span className="text-sm font-medium text-foreground">
                    {form.weight} kg ({kgToLbs(form.weight)} lbs)
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Preferred Date */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Preferred Date
            </h4>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">
                {form.preferred_date
                  ? new Date(form.preferred_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </motion.div>

          {/* Disclaimers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Important Reminders:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>All information provided will be reviewed by our medical team.</li>
                  <li>You will receive a detailed assessment within 48 hours.</li>
                  <li>Additional medical documentation may be requested.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <DialogFooter className="gap-3 pt-4">
          <Button variant="outline" onClick={onEdit} disabled={isSubmitting}>
            Edit
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Submit to Doctor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}