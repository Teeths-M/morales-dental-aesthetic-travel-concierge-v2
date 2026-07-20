import React, { useState } from 'react';
import { AlertTriangle, X, PhoneCall, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import CrisisCountdownTimer from './CrisisCountdownTimer';

const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Detects in-flux cases from raw CaseRecord data
function getInFluxCases(cases) {
  const now = new Date();
  return cases
    .filter(c => c.status !== 'Completed')
    .filter(c => {
      // Explicitly flagged by backend
      if (c.fallback_state?.in_flux === true) return true;

      // Auto-detect: doctor notified but no confirmation past window
      if (
        c.doctor_confirmation_status === 'PENDING' &&
        c.doctor_notified_at &&
        (now.getTime() - new Date(c.doctor_notified_at).getTime()) > CONFIRMATION_WINDOW_MS
      ) return true;

      return false;
    })
    .map(c => {
      // If explicitly flagged, use stored state
      if (c.fallback_state?.in_flux === true) return c;

      // Synthesize fallback state from existing fields
      const deadline = new Date(new Date(c.doctor_notified_at).getTime() + CONFIRMATION_WINDOW_MS);
      return {
        ...c,
        fallback_state: {
          in_flux: true,
          primary_partner_type: 'doctor',
          primary_partner_name: c.doctor_selected || 'Assigned Doctor',
          confirmation_deadline: deadline.toISOString(),
          current_escalation_level: 1,
          escalation_reason: 'DOCTOR_MISSED_CONFIRMATION_WINDOW',
          human_intervention_required: false,
          fallback_sequence: [],
          audit_trail: [],
        },
      };
    });
}

function EscalateModal({ caseRecord, onClose, onLogged }) {
  const [loading, setLoading] = useState(false);
  const fallback = caseRecord.fallback_state || {};
  const activeBackup = fallback.fallback_sequence?.find(f => f.confirmation_status === 'PENDING');

  const contacts = [
    activeBackup?.dispatch_phone && { label: 'Backup Provider Dispatch', phone: activeBackup.dispatch_phone },
    activeBackup?.clinical_director_phone && { label: 'Clinical Director', phone: activeBackup.clinical_director_phone },
    fallback.primary_partner_contact_phone && { label: `${fallback.primary_partner_name} Direct`, phone: fallback.primary_partner_contact_phone },
  ].filter(Boolean);

  const handleLogIntervention = async () => {
    setLoading(true);
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'HUMAN_INTERVENTION_TRIGGERED',
        actor: 'Admin',
        notes: `Escalate button clicked via crisis panel. Case priority set to Critical.`,
      };

      // User-scoped: asServiceRole throws in the browser (backend-only) — this
      // escalation write ALWAYS failed. Admin RLS permits the update directly.
      await base44.entities.CaseRecord.update(caseRecord.id, {
        case_priority: 'Critical',
        fallback_state: {
          ...fallback,
          in_flux: true,
          human_intervention_required: true,
          human_intervention_triggered_at: new Date().toISOString(),
          current_escalation_level: 3,
          escalation_reason: 'MANUAL_ESCALATION',
          audit_trail: [...(fallback.audit_trail || []), auditEntry],
        },
        admin_notes: `[ESCALATION ${new Date().toLocaleString()} UTC] Human intervention triggered via admin crisis panel.\n${caseRecord.admin_notes || ''}`.trim(),
      });

      toast.success('Intervention logged. Case marked Critical. Audit trail updated.');
      onLogged?.();
      onClose();
    } catch (e) {
      // Raw e.message is for the console, not the operator (Wiz #10).
      console.error('[FallbackCrisisAlert] intervention log failed:', e?.message);
      toast.error('Failed to log intervention — the case was NOT escalated. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    setLoading(true);
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'CRISIS_RESOLVED',
        actor: 'Admin',
        notes: 'Marked resolved via admin crisis panel.',
      };
      await base44.entities.CaseRecord.update(caseRecord.id, {
        fallback_state: {
          ...fallback,
          in_flux: false,
          resolved_at: new Date().toISOString(),
          audit_trail: [...(fallback.audit_trail || []), auditEntry],
        },
      });
      toast.success('Crisis resolved — case removed from In-Flux panel.');
      onLogged?.();
      onClose();
    } catch (e) {
      toast.error('Failed to resolve: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-none">HUMAN INTERVENTION</h3>
              <p className="text-red-200 text-xs mt-0.5">Immediate coordinator action required</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Case Summary */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-semibold text-red-900 text-base">{caseRecord.client_name}</p>
            <p className="text-red-700 text-sm mt-0.5">{caseRecord.procedures?.join(', ')} — {caseRecord.procedure_country}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                {fallback.escalation_reason?.replace(/_/g, ' ')}
              </Badge>
              <Badge className="bg-slate-100 text-slate-600 text-xs">
                Level {fallback.current_escalation_level || 1} Escalation
              </Badge>
            </div>
          </div>

          {/* Instruction */}
          <p className="text-sm text-slate-600 leading-relaxed">
            All automated routing attempts have been exhausted or timed out. A live coordinator must contact dispatch directly and confirm coverage before the patient is notified.
          </p>

          {/* Direct Contacts */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direct Emergency Contacts</p>
            {contacts.length > 0 ? (
              contacts.map((c, i) => (
                <a
                  key={i}
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <PhoneCall className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{c.label}</p>
                    <p className="font-mono font-semibold text-slate-900 text-lg leading-none mt-0.5">{c.phone}</p>
                  </div>
                  <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                    Tap to Call
                  </span>
                </a>
              ))
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                ⚠️ No direct contacts stored yet. Open the case detail drawer and add phone numbers to the fallback sequence.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
              onClick={handleLogIntervention}
              disabled={loading}
            >
              🚨 LOG INTERVENTION & MARK CRITICAL
            </Button>
            <Button
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50 h-10"
              onClick={handleMarkResolved}
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Resolved — Remove from In-Flux
            </Button>
          </div>
          <p className="text-xs text-center text-slate-400">
            All actions are timestamped and written to the case audit trail for legal review.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FallbackCrisisAlert({ cases, onRefresh }) {
  const [escalatingCase, setEscalatingCase] = useState(null);

  const inFluxCases = getInFluxCases(cases);

  if (inFluxCases.length === 0) return null;

  return (
    <>
      <div className="rounded-2xl border-2 border-amber-400 overflow-hidden shadow-xl">
        {/* Alert Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white font-semibold text-sm uppercase tracking-wide">
              IN-FLUX: Fallback Routing Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="text-amber-100 font-semibold text-sm">
              {inFluxCases.length} Case{inFluxCases.length !== 1 ? 's' : ''} Require Immediate Attention
            </span>
          </div>
        </div>

        {/* Crisis Case Cards */}
        <div className="bg-white p-4 space-y-4">
          {inFluxCases.map((c) => {
            const fallback = c.fallback_state || {};
            const activeBackup = fallback.fallback_sequence?.find(f => f.confirmation_status === 'PENDING');
            const deadline = activeBackup?.confirmation_deadline || fallback.confirmation_deadline;
            const missedPartner = fallback.primary_partner_name || c.doctor_selected || 'Primary Partner';
            const escalationLevel = fallback.current_escalation_level || 1;
            const humanRequired = fallback.human_intervention_required;

            return (
              <div
                key={c.id}
                className={`rounded-xl border-2 p-4 ${
                  humanRequired
                    ? 'border-red-400 bg-red-50'
                    : escalationLevel >= 2
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-amber-300 bg-amber-50'
                }`}
              >
                {/* Case Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-base">{c.client_name}</span>
                      {humanRequired ? (
                        <Badge className="bg-red-600 text-white text-xs animate-pulse">🔴 HUMAN REQUIRED</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white text-xs">⚠️ Level {escalationLevel} Escalation</Badge>
                      )}
                      {c.case_priority === 'Critical' && (
                        <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">CRITICAL</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.procedures?.join(', ')} — {c.procedure_country || 'Destination TBD'}
                    </p>
                    {fallback.escalation_reason && (
                      <p className="text-xs text-red-600 font-medium mt-0.5">
                        Reason: {fallback.escalation_reason.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 h-9 px-3"
                    onClick={() => setEscalatingCase(c)}
                  >
                    🚨 Escalate
                  </Button>
                </div>

                {/* Partner Chain Visual */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {/* Primary — missed */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="line-through">{missedPartner}</span>
                    <span className="no-underline font-semibold ml-0.5">❌ MISSED</span>
                  </div>

                  <span className="text-slate-400 font-semibold">→</span>

                  {/* Active backup */}
                  {activeBackup ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
                      <User className="w-3 h-3 shrink-0" />
                      {activeBackup.partner_name}
                      <span className="text-blue-500 ml-0.5">⏳ Awaiting</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium">
                      No backup in queue — assign manually
                    </div>
                  )}
                </div>

                {/* Countdown Timer */}
                {deadline ? (
                  <CrisisCountdownTimer deadline={deadline} onExpired={onRefresh} />
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 font-medium">
                    ⏰ Confirmation window has already expired
                  </div>
                )}

                {/* Audit Trail Preview */}
                {fallback.audit_trail?.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    Last action: {fallback.audit_trail[fallback.audit_trail.length - 1]?.action?.replace(/_/g, ' ')} —{' '}
                    {new Date(fallback.audit_trail[fallback.audit_trail.length - 1]?.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {escalatingCase && (
        <EscalateModal
          caseRecord={escalatingCase}
          onClose={() => setEscalatingCase(null)}
          onLogged={() => {
            setEscalatingCase(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}