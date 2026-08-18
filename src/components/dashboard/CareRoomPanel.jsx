import { MessageCircle } from 'lucide-react';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import CaseThread from '@/components/quotes/CaseThread';
import CareTimeline from '@/components/quotes/CareTimeline';

/**
 * CareRoomPanel — the patient-facing "Care Room": the real Gate 2/3 surface.
 * Renders nothing until a doctor has actually confirmed the case
 * (doctor_confirmation_status === 'CONFIRMED') — before that, contact stays
 * routed through the existing pre-assignment flows (M-Care chat / quote
 * comparison), matching the Gate 1 rule. Sourced from the same
 * useActiveCaseRecord hook TravelPassCard already uses, so this needs no
 * new data-fetching pattern on Dashboard.jsx itself.
 */
export default function CareRoomPanel({ userEmail }) {
  const { data: caseRecord } = useActiveCaseRecord(userEmail);

  if (!caseRecord || caseRecord.doctor_confirmation_status !== 'CONFIRMED') return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-2 text-white/70 text-sm font-semibold">
        <MessageCircle className="w-4 h-4" /> Your Care Room
      </div>
      <CareTimeline caseRecord={caseRecord} theme="dark" />
      <CaseThread caseId={caseRecord.id} viewer="patient" theme="dark" />
    </div>
  );
}
