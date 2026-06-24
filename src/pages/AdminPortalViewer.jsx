import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Stethoscope, Plane, Car } from 'lucide-react';
import { parseISO, addDays, format as dateFnsFormat } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';

const USD = (val) => `$${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Doctor Portal View (read-only) ──────────────────────────────────────────
function DoctorPortalView({ caseData, consultation }) {
  if (!caseData) return <p className="text-slate-500 text-center py-8">No case data.</p>;
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 font-medium">
        👁 Admin read-only view — actions disabled
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-semibold text-slate-800 text-lg">Patient: {caseData.client_name}</h3>
        <p className="text-sm text-slate-500">Procedure: {caseData.procedures?.join(', ')}</p>
        <div className="grid md:grid-cols-2 gap-3 mt-2">
          {[
            ['Age', consultation?.age],
            ['Gender', consultation?.gender],
            ['Nationality', consultation?.nationality],
            ['Occupation', consultation?.occupation],
            ['Client Country', caseData.client_country],
            ['Destination', consultation?.destination_country],
            ['Phone', caseData.client_phone],
            ['Email', caseData.client_email],
            ['Preferred Date', consultation?.preferred_date ? new Date(consultation.preferred_date).toLocaleDateString() : null],
            ['Duration of Stay', consultation?.duration_of_stay],
            ['Emergency Contact', consultation?.emergency_contact_name ? `${consultation.emergency_contact_name} (${consultation.emergency_contact_number})` : null],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-medium text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        {consultation?.medical_conditions?.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Medical Conditions</p>
            <p className="text-sm font-medium text-slate-800">{consultation.medical_conditions.join(', ')}</p>
          </div>
        )}
        {consultation?.allergies?.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Allergies</p>
            <p className="text-sm font-medium text-slate-800">{consultation.allergies.join(', ')}</p>
          </div>
        )}
        {consultation?.takes_medications && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Medications</p>
            <p className="text-sm font-medium text-slate-800">{consultation.medication_types?.join(', ')}</p>
          </div>
        )}
        {caseData.consultation_summary && (
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Medical Summary</p>
            <p className="text-sm text-slate-700">{caseData.consultation_summary}</p>
          </div>
        )}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Doctor Response Status</p>
          <span className={`text-sm font-semibold ${caseData.doctor_confirmation_status === 'CONFIRMED' ? 'text-emerald-600' : caseData.doctor_confirmation_status === 'DECLINED' ? 'text-red-500' : 'text-amber-600'}`}>
            {caseData.doctor_confirmation_status || 'PENDING'}
          </span>
          {caseData.doctor_notes && (
            <p className="text-sm text-slate-600 mt-1 italic">"{caseData.doctor_notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Travel Agency Portal View (read-only) ────────────────────────────────────
function TravelAgencyPortalView({ consultation }) {
  if (!consultation) return <p className="text-slate-500 text-center py-8">No consultation data.</p>;

  const travelDates = (() => {
    if (!consultation.preferred_date || !consultation.duration_of_stay) return null;
    const arrivalDate = parseISO(consultation.preferred_date);
    const durationMatch = consultation.duration_of_stay.match(/(\d+)\s*(day|night)s?/i);
    const days = durationMatch ? parseInt(durationMatch[1]) : 7;
    return {
      arrival: dateFnsFormat(arrivalDate, 'MMMM d, yyyy'),
      return: dateFnsFormat(addDays(arrivalDate, days), 'MMMM d, yyyy'),
      days,
      nights: days - 1,
    };
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 font-medium">
        👁 Admin read-only view — actions disabled
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0F3A20] px-5 py-4">
          <p className="text-xs tracking-widest text-[#C5A059] uppercase mb-1">Travel Request</p>
          <h3 className="text-white font-serif text-xl font-normal">{consultation.patient_name}</h3>
          <p className="text-white/60 text-sm mt-1">{(consultation.procedure_interest || '').replace(/_/g, ' ')} · {consultation.destination_country}</p>
        </div>
        <div className="p-5 space-y-3">
          {travelDates && (
            <div className="grid grid-cols-3 gap-3 bg-green-50 rounded-lg p-4 border border-green-100">
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase">Arrival</p>
                <p className="text-sm font-semibold text-slate-800">{travelDates.arrival}</p>
              </div>
              <div className="border-l border-green-200 pl-3">
                <p className="text-xs text-green-700 font-semibold uppercase">Duration</p>
                <p className="text-sm font-semibold text-slate-800">{travelDates.days} days / {travelDates.nights} nights</p>
              </div>
              <div className="border-l border-green-200 pl-3">
                <p className="text-xs text-green-700 font-semibold uppercase">Return</p>
                <p className="text-sm font-semibold text-slate-800">{travelDates.return}</p>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {consultation.flight_cost_usd > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Quoted Flight Cost</p>
                <p className="text-sm font-semibold text-slate-800">{USD(consultation.flight_cost_usd)}</p>
              </div>
            )}
            {consultation.hotel_cost_usd > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Quoted Hotel Cost</p>
                <p className="text-sm font-semibold text-slate-800">{USD(consultation.hotel_cost_usd)}</p>
              </div>
            )}
            {consultation.flight_itinerary_summary && (
              <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-slate-400">Flight Itinerary</p>
                <p className="text-sm text-slate-700">{consultation.flight_itinerary_summary}</p>
              </div>
            )}
            {consultation.hotel_selection && (
              <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-slate-400">Hotel Selection</p>
                <p className="text-sm font-medium text-slate-800">{consultation.hotel_selection}</p>
              </div>
            )}
          </div>
          {!consultation.flight_cost_usd && !consultation.hotel_cost_usd && (
            <p className="text-sm text-slate-400 italic text-center py-4">Travel agency has not submitted a quote yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chauffeur Portal View (read-only) ────────────────────────────────────────
function ChauffeurPortalView({ consultation }) {
  if (!consultation) return <p className="text-slate-500 text-center py-8">No consultation data.</p>;

  const legs = [
    { label: 'LEG 1 — Client Home → Airport', value: consultation.leg_1_cost_usd, type: 'origin' },
    { label: 'LEG 2 — Airport → Client Home', value: consultation.leg_2_cost_usd, type: 'origin' },
    { label: 'LEG 3 — Destination Airport → Hotel', value: consultation.leg_3_cost_usd, type: 'destination' },
    { label: 'LEG 4 — Hotel → Clinic', value: consultation.leg_4_cost_usd, type: 'destination' },
    { label: 'LEG 5 — Clinic → Hotel', value: consultation.leg_5_cost_usd, type: 'destination' },
    { label: 'LEG 6 — Hotel → Destination Airport', value: consultation.leg_6_cost_usd, type: 'destination' },
  ];

  const originTotal = (consultation.leg_1_cost_usd || 0) + (consultation.leg_2_cost_usd || 0);
  const destTotal = (consultation.leg_3_cost_usd || 0) + (consultation.leg_4_cost_usd || 0) + (consultation.leg_5_cost_usd || 0) + (consultation.leg_6_cost_usd || 0);
  const hasQuotes = legs.some(l => l.value > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 font-medium">
        👁 Admin read-only view — actions disabled
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0F3A20] px-5 py-4">
          <p className="text-xs tracking-widest text-[#C5A059] uppercase mb-1">Transfer Logistics</p>
          <h3 className="text-white font-serif text-xl font-normal">{consultation.patient_name}</h3>
          <p className="text-white/60 text-sm mt-1">{consultation.client_country} → {consultation.destination_country || consultation.procedure_country}</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Origin Legs */}
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">🏠 Origin Driver Legs</p>
            <div className="space-y-2">
              {legs.filter(l => l.type === 'origin').map(leg => (
                <div key={leg.label} className="flex justify-between items-center bg-blue-50 rounded-lg px-4 py-3">
                  <p className="text-sm text-slate-700">{leg.label}</p>
                  <p className="text-sm font-semibold text-blue-800">{leg.value > 0 ? USD(leg.value) : <span className="text-slate-400 font-normal">Pending</span>}</p>
                </div>
              ))}
              {originTotal > 0 && (
                <div className="flex justify-between items-center bg-blue-100 rounded-lg px-4 py-2">
                  <p className="text-sm font-semibold text-blue-900">Origin Total</p>
                  <p className="text-sm font-semibold text-blue-900">{USD(originTotal)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Destination Legs */}
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✈️ Destination Driver Legs</p>
            <div className="space-y-2">
              {legs.filter(l => l.type === 'destination').map(leg => (
                <div key={leg.label} className="flex justify-between items-center bg-green-50 rounded-lg px-4 py-3">
                  <p className="text-sm text-slate-700">{leg.label}</p>
                  <p className="text-sm font-semibold text-green-800">{leg.value > 0 ? USD(leg.value) : <span className="text-slate-400 font-normal">Pending</span>}</p>
                </div>
              ))}
              {destTotal > 0 && (
                <div className="flex justify-between items-center bg-green-100 rounded-lg px-4 py-2">
                  <p className="text-sm font-semibold text-green-900">Destination Total</p>
                  <p className="text-sm font-semibold text-green-900">{USD(destTotal)}</p>
                </div>
              )}
            </div>
          </div>

          {!hasQuotes && (
            <p className="text-sm text-slate-400 italic text-center py-4">No chauffeur quotes submitted yet.</p>
          )}

          {consultation.transfer_notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Transfer Notes</p>
              <p className="text-sm text-slate-700">{consultation.transfer_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPortalViewer() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case_id');

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(caseId || '');

  // Load all cases for selector
  useEffect(() => {
    base44.entities.CaseRecord.list('-created_date', 100).then(setCases).catch(() => {});
  }, []);

  // Load selected case + consultation
  useEffect(() => {
    if (!selectedCaseId) { setLoading(false); return; }
    setLoading(true);
    base44.entities.CaseRecord.filter({ id: selectedCaseId })
      .then(async (results) => {
        const c = results[0];
        setCaseData(c || null);
        if (c?.consultation_id) {
          try {
            const cons = await base44.entities.Consultation.get(c.consultation_id);
            setConsultation(cons);
          } catch { setConsultation(null); }
        } else {
          setConsultation(null);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedCaseId]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold font-display">Partner Portal Viewer</h1>
          <p className="text-muted-foreground mt-1">View all partner portals for any case — admin override mode</p>
        </div>
        <div className="max-w-5xl mx-auto space-y-5">
        {/* Case Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-700">Select Case:</label>
          <select
            className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)}
          >
            <option value="">— choose a case —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.client_name} · {c.procedures?.[0]} · {c.status}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && !selectedCaseId && (
          <div className="text-center py-16 text-slate-400 text-sm">Select a case above to view all partner portals.</div>
        )}

        {!loading && selectedCaseId && !caseData && (
          <div className="text-center py-16 text-red-400 text-sm">Case not found.</div>
        )}

        {!loading && caseData && (
          <>
            {/* Case header */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{caseData.client_name}</h2>
                  <p className="text-sm text-slate-500">{caseData.procedures?.join(', ')} · {caseData.procedure_country} · Status: <strong>{caseData.status}</strong></p>
                </div>
                {caseData.doctor_selected && (
                  <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-1">
                    👨‍⚕️ {caseData.doctor_selected} · {caseData.clinic_selected}
                  </div>
                )}
              </div>
            </div>

            {/* Portal Tabs */}
            <Tabs defaultValue="doctor">
              <TabsList className="bg-white border border-slate-200">
                <TabsTrigger value="doctor" className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" /> Doctor Portal
                </TabsTrigger>
                <TabsTrigger value="travel" className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" /> Travel Agency Portal
                </TabsTrigger>
                <TabsTrigger value="chauffeur" className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Chauffeur Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="doctor" className="mt-4">
                <DoctorPortalView caseData={caseData} consultation={consultation} />
              </TabsContent>

              <TabsContent value="travel" className="mt-4">
                <TravelAgencyPortalView consultation={consultation} />
              </TabsContent>

              <TabsContent value="chauffeur" className="mt-4">
                <ChauffeurPortalView consultation={consultation} />
              </TabsContent>
            </Tabs>
          </>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}