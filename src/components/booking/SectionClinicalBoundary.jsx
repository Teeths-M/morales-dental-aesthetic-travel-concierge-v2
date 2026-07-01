import React from 'react';
import { Shield, CheckSquare, Square, AlertCircle, Heart } from 'lucide-react';

const BOUNDARY_VERSION = '1.0';

export default function SectionClinicalBoundary({ form, update, showValidation = false }) {
  const isMissing = showValidation && !form.clinical_boundary_acknowledged;

  const handleToggle = () => {
    const newVal = !form.clinical_boundary_acknowledged;
    update('clinical_boundary_acknowledged', newVal);
    if (newVal) {
      update('clinical_boundary_acknowledged_at', new Date().toISOString());
      update('clinical_boundary_version', BOUNDARY_VERSION);
    } else {
      update('clinical_boundary_acknowledged_at', null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Care Coordination Agreement</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Please read and acknowledge the following before completing your request.
      </p>

      {/* Boundary Statement Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-primary">Our Role in Your Journey</p>
        </div>

        <div className="space-y-3 text-sm text-foreground leading-relaxed">
          <p>
            <strong>Morales Medical Travel Safety</strong> (the "Platform") specializes in coordinating medical travel logistics — helping you connect with verified healthcare providers, arrange safe travel, and support your recovery journey.
          </p>
          <div className="rounded-xl p-4 border border-border space-y-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="font-semibold text-sm text-foreground">What the Platform provides:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
              <li>Coordination with verified, licensed medical providers</li>
              <li>Travel, accommodation, and logistics planning</li>
              <li>Safety screening support via SAFE-T4LIFE™ protocol</li>
              <li>Companion and recovery coordination services</li>
              <li>Communication support between you and your provider</li>
            </ul>
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <p className="font-semibold text-sm" style={{ color: '#D4AF37' }}>What the Platform does NOT do:</p>
            <ul className="list-disc list-inside space-y-1 text-xs" style={{ color: 'rgba(212,175,55,0.75)' }}>
              <li>Diagnose medical conditions</li>
              <li>Prescribe medications or treatments</li>
              <li>Replace or substitute licensed clinical care</li>
              <li>Provide medical advice or second opinions</li>
              <li>Make treatment decisions on your behalf</li>
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            All clinical decisions, medical advice, diagnosis, prescriptions, and treatment recommendations are made exclusively by licensed healthcare providers assigned to your care.
          </p>
        </div>
      </div>

      {/* Required Acknowledgement */}
      <div
        className="rounded-xl border p-4 transition-all"
        style={{
          background: isMissing ? 'rgba(239,68,68,0.10)' : form.clinical_boundary_acknowledged ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
          borderColor: isMissing ? 'rgba(239,68,68,0.6)' : form.clinical_boundary_acknowledged ? 'rgba(34,197,94,0.6)' : 'rgba(212,175,55,0.2)',
        }}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-start gap-3 w-full text-left"
        >
          {form.clinical_boundary_acknowledged
            ? <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            : <Square className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
          <span className={`text-sm leading-relaxed ${form.clinical_boundary_acknowledged ? 'text-emerald-400' : 'text-foreground'}`}>
            <strong>I understand and agree</strong> that Morales coordinates care and travel logistics, but clinical decisions, medical advice, diagnoses, prescriptions, and treatment recommendations are made only by licensed providers assigned to my care. I acknowledge that the Platform does not practice medicine and is not a substitute for professional medical care. <span className="text-destructive">*</span>
          </span>
        </button>

        {form.clinical_boundary_acknowledged && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Acknowledged {form.clinical_boundary_acknowledged_at ? new Date(form.clinical_boundary_acknowledged_at).toLocaleString() : ''} · Version {form.clinical_boundary_version || BOUNDARY_VERSION}
          </p>
        )}

        {isMissing && (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-600">You must acknowledge this agreement to proceed.</p>
          </div>
        )}
      </div>
    </div>
  );
}