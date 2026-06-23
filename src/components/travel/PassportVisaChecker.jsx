import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/brandTokens';

export default function PassportVisaChecker({ destinationCountry, selectedPassportId, onVisaCheckComplete }) {
  const [checkingVisa, setCheckingVisa] = useState(false);
  const [visaResult, setVisaResult] = useState(null);

  const handleCheckVisa = async () => {
    if (!selectedPassportId || !destinationCountry) return;
    
    setCheckingVisa(true);
    try {
      const response = await base44.functions.invoke('checkVisaRequirements', {
        passport_id: selectedPassportId,
        destination_country: destinationCountry
      });
      
      setVisaResult(response.data);
      if (onVisaCheckComplete) {
        onVisaCheckComplete(response.data);
      }
    } catch (error) {
      console.error('Visa check failed:', error);
    } finally {
      setCheckingVisa(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCheckVisa}
        disabled={checkingVisa || !selectedPassportId || !destinationCountry}
        className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold"
      >
        {checkingVisa ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Checking Visa Requirements...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Check Visa Requirements with AI
          </>
        )}
      </Button>

      {visaResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-5 border ${
            visaResult.visa_required === 'no' 
              ? 'bg-emerald-500/20 border-emerald-400/40' 
              : visaResult.visa_required === 'yes'
              ? 'bg-amber-500/20 border-amber-400/40'
              : 'bg-blue-500/20 border-blue-400/40'
          }`}
        >
          <div className="flex items-start gap-3 mb-3">
            {visaResult.visa_required === 'no' ? (
              <CheckCircle className="w-6 h-6 text-emerald-300 flex-shrink-0" />
            ) : visaResult.visa_required === 'yes' ? (
              <AlertTriangle className="w-6 h-6 text-amber-300 flex-shrink-0" />
            ) : (
              <Shield className="w-6 h-6 text-blue-300 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>
                {visaResult.visa_required === 'no' 
                  ? 'No Visa Required' 
                  : visaResult.visa_required === 'yes'
                  ? 'Visa Required'
                  : 'Visa Information'}
              </p>
              <p className="text-white/80 text-sm mt-1">{visaResult.summary}</p>
            </div>
          </div>

          {visaResult.details && (
            <div className="space-y-2 text-sm text-white/75">
              {visaResult.details.allowed_stay && (
                <p>• Allowed Stay: {visaResult.details.allowed_stay}</p>
              )}
              {visaResult.details.requirements && (
                <p>• Requirements: {visaResult.details.requirements}</p>
              )}
              {visaResult.details.processing_time && (
                <p>• Processing Time: {visaResult.details.processing_time}</p>
              )}
              {visaResult.details.embassy_link && (
                <a
                  href={visaResult.details.embassy_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-300 hover:text-blue-200 mt-2"
                >
                  View Embassy Information <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}