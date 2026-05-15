import React from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConsultationMedicalCart() {
  const { items, removeItem, getTotalCount } = useCart();
  const totalCount = getTotalCount();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Consultation Medical Cart</h3>
        <span className="ml-auto text-xs font-bold bg-primary text-primary-foreground rounded-full px-2 py-1">
          {totalCount}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No procedures selected yet. Browse services to add.
        </p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2.5 border border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {item.preparation_notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.preparation_notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Qty: <span className="font-semibold">{item.quantity}</span>
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0 ml-2"
                  onClick={() => removeItem(item.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}