import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsultationIntake({ consultations, isLoading, onConverted }) {
  const [processingId, setProcessingId] = useState(null);

  const ingestConsultation = async (consultationId) => {
    setProcessingId(consultationId);
    try {
      await base44.functions.invoke('iq200Pipeline', { 
        action: 'create', 
        consultation_id: consultationId 
      });
      toast.success('Case created successfully!');
      if (onConverted) onConverted();
    } catch (error) {
      toast.error('Failed to create case: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6 text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">All caught up!</p>
          <p className="text-sm text-slate-500">No new consultations waiting.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {consultations.map(consultation => (
        <Card key={consultation.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{consultation.patient_name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {consultation.procedure_interest?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 truncate">{consultation.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>📍 {consultation.client_country} → {consultation.destination_country}</span>
                  <span>📅 Prefers: {consultation.preferred_date}</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => ingestConsultation(consultation.id)}
                disabled={processingId === consultation.id}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
              >
                {processingId === consultation.id ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-2" />
                    Convert to Case
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}