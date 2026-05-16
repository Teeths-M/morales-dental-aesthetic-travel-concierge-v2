import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';

const statusConfig = {
  'risk_check': { icon: AlertCircle, label: 'Risk Check', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  'doctor': { icon: CheckCircle2, label: 'Doctor Confirmation', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  'travel': { icon: Clock, label: 'Travel & Logistics', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  'hotel': { icon: Clock, label: 'Hotel Booking', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  'cab': { icon: Clock, label: 'Transportation', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  'completed': { icon: CheckCircle2, label: 'Completed', color: 'bg-green-50 border-green-200 text-green-700' },
  'blocked': { icon: AlertCircle, label: 'Risk Blocked', color: 'bg-red-50 border-red-200 text-red-700' }
};

const paymentStatusConfig = {
  'pending': { label: 'Awaiting Payment', color: 'bg-orange-50 text-orange-700' },
  'partial_paid': { label: 'Partially Paid', color: 'bg-blue-50 text-blue-700' },
  'fully_paid': { label: 'Fully Paid', color: 'bg-green-50 text-green-700' },
  'awaiting_selection': { label: 'Awaiting Selection', color: 'bg-slate-50 text-slate-700' }
};

export default function WorkflowDashboard({ workflows = [], isLoading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-2xl text-foreground">Active Workflows</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No active workflows yet.</p>
        </Card>
      ) : (
        workflows.map((workflow, i) => {
          const stageConfig = statusConfig[workflow.stage] || statusConfig.risk_check;
          const StageIcon = stageConfig.icon;
          const isExpanded = expandedId === workflow.id;

          return (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`border-l-4 cursor-pointer transition-all ${
                  isExpanded ? 'ring-2 ring-primary' : ''
                } ${stageConfig.color.split(' ')[0]}`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                  className="p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${stageConfig.color}`}>
                      <StageIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{workflow.patient_name}</h3>
                      <p className="text-sm text-muted-foreground">{workflow.consultation_id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={stageConfig.color}>{stageConfig.label}</Badge>
                      <Badge variant="outline">{workflow.stage}</Badge>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-border px-6 py-4 space-y-4 bg-secondary/30"
                  >
                    {/* Risk Assessment */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Risk Assessment</p>
                      <div className="flex gap-2">
                        <Badge
                          className={
                            workflow.risk_result === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : workflow.risk_result === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {workflow.risk_result?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                      {workflow.risk_summary && (
                        <p className="text-sm text-muted-foreground mt-2">{workflow.risk_summary}</p>
                      )}
                    </div>

                    {/* Stage Status */}
                    <div className="grid grid-cols-2 gap-4">
                      {['doctor', 'travel', 'hotel', 'cab'].map(stage => {
                        const status = workflow[`${stage}_status`] || 'pending';
                        return (
                          <div key={stage}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              {stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {status.toUpperCase()}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>

                    {/* Timeline */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Timeline</p>
                      <div className="space-y-2 text-sm">
                        <p>📧 Created: {new Date(workflow.created_date).toLocaleDateString()}</p>
                        <p>🔄 Last Updated: {new Date(workflow.updated_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {workflow.doctor_notes && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Doctor Notes</p>
                        <p className="text-sm text-foreground">{workflow.doctor_notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button size="sm" variant="default">View Full Details</Button>
                      <Button size="sm" variant="outline">Send Message</Button>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })
      )}
    </div>
  );
}