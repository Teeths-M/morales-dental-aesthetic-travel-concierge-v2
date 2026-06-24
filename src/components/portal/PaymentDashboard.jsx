import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const paymentStatusConfig = {
  awaiting_selection: { label: 'Awaiting Selection', color: 'bg-slate-50 text-slate-700', icon: '⏳' },
  pending_payment: { label: 'Pending Payment', color: 'bg-orange-50 text-orange-700', icon: '⏳' },
  partial_paid: { label: 'Partially Paid', color: 'bg-blue-50 text-blue-700', icon: '💳' },
  fully_paid: { label: 'Fully Paid', color: 'bg-green-50 text-green-700', icon: '✓' },
  overdue: { label: 'Overdue', color: 'bg-red-50 text-red-700', icon: '⚠️' }
};

export default function PaymentDashboard({ paymentPlans = [] }) {
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

  const handleSendInvoice = async (plan) => {
    setSendingInvoiceId(plan.id);
    try {
      await base44.functions.invoke('sendInvoiceEmail', {
        consultation_id: plan.consultation_id,
        amount_due: plan.amount_due_today,
        final_cost: plan.final_cost,
        plan_type: plan.plan_type,
        payment_status: plan.payment_status,
      });
      toast.success('Invoice sent successfully');
    } catch (err) {
      toast.error('Failed to send invoice: ' + err.message);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const stats = {
    total_revenue: paymentPlans.reduce((sum, p) => sum + (p.final_cost || 0), 0),
    fully_paid: paymentPlans.filter(p => p.payment_status === 'fully_paid').length,
    pending: paymentPlans.filter(p => p.payment_status === 'pending_payment').length,
    partial: paymentPlans.filter(p => p.payment_status === 'partial_paid').length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${stats.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'green' },
          { label: 'Fully Paid', value: stats.fully_paid, icon: '✓', color: 'green' },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: 'orange' },
          { label: 'Partial', value: stats.partial, icon: '💳', color: 'blue' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-6 border-l-4" style={{
              borderLeftColor: { green: '#22c55e', orange: '#f97316', blue: '#3b82f6' }[stat.color]
            }}>
              <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment Plans */}
      <div>
        <h3 className="font-display text-xl text-foreground mb-4">Active Payment Plans</h3>
        <div className="space-y-3">
          {paymentPlans.map((plan, i) => {
            const statusConfig = paymentStatusConfig[plan.payment_status];
            const progress = (plan.amount_due_today / plan.final_cost) * 100;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{plan.consultation_id}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        <Badge variant="outline">{plan.plan_type}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${plan.final_cost.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: ${plan.amount_due_today.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">View Details</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={sendingInvoiceId === plan.id}
                      onClick={() => handleSendInvoice(plan)}
                    >
                      {sendingInvoiceId === plan.id
                        ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Sending...</>
                        : 'Send Invoice'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}