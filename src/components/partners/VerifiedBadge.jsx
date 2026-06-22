import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Award } from 'lucide-react';

export default function VerifiedBadge({ partnerType, verifiedAt }) {
  return (
    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-full px-3 py-1.5">
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
        <Shield className="w-3 h-3 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-emerald-800">Verified by Morales</p>
        <p className="text-[10px] text-emerald-600">
          {partnerType === 'doctor' ? 'Medical Professional' : 
           partnerType === 'travel_agency' ? 'Travel Partner' :
           partnerType === 'taxi_service' ? 'Transport Partner' :
           partnerType === 'companion' ? 'Care Companion' : 'Verified Partner'}
          {verifiedAt && ` • ${new Date(verifiedAt).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  );
}