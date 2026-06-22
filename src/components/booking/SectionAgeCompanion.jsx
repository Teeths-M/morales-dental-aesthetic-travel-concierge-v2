import React, { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckSquare, Square, Users, Heart, Radio } from 'lucide-react';

const AGE_THRESHOLD = 65;

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function SectionAgeCompanion({ form, update, showValidation = false }) {
  const age = calcAge(form.date_of_birth);

  // Auto-compute companion requirement when DOB changes
  useEffect(() => {
    if (age !== null && age >= AGE_THRESHOLD) {
      if (!form.requires_companion) {
        update('requires_companion', true);
        update('companion_requirement_reason', 'age_threshold');
        update('companion_requirement_status', 'pending');
      }
    } else if (age !== null && age < AGE_THRESHOLD) {
      if (form.companion_requirement_reason === 'age_threshold') {
        update('requires_companion', false);
        update('companion_requirement_reason', null);
        update('companion_requirement_status', 'not_required');
      }
    }
  }, [age]);

  const isMissingDob = showValidation && !form.date_of_birth;
  const showCompanionCard = form.requires_companion;
  const waiverDeclined = form.waiver_action === 'decline';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Date of Birth & Care Companion</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Your date of birth helps us ensure your care journey is appropriate and properly supported.
      </p>

      {/* Date of Birth */}
      <div>
        <Label>Date of Birth <span className="text-destructive">*</span></Label>
        <Input
          type="date"
          value={form.date_of_birth || ''}
          onChange={e => update('date_of_birth', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className={`mt-1.5 ${isMissingDob ? 'border-red-400' : ''}`}
        />
        {isMissingDob && <p className="text-xs text-red-500 mt-1">Date of birth is required.</p>}
        {age !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Age at time of booking: <strong>{age} years</strong>
          </p>
        )}
      </div>

      {/* Companion Requirement Notice — shown if age ≥ threshold */}
      {showCompanionCard && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">A Travel Companion is Recommended for Your Journey</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Based on your profile, our care model recommends a dedicated travel companion to support you during your journey, at the clinic, and during recovery. This is to ensure you have the best possible experience and safety throughout.
              </p>
            </div>
          </div>

          <div className="bg-white/80 rounded-xl p-4 text-sm text-foreground space-y-2">
            <p className="font-medium text-sm">Your companion will:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
              <li>Accompany you at the airport and during transfers</li>
              <li>Support you at the clinic and during consultations</li>
              <li>Assist with recovery and daily needs at the hotel</li>
              <li>Provide translation and cultural support as needed</li>
            </ul>
          </div>

          <p className="text-xs text-amber-700">
            Your coordinator will assign a companion once your case is confirmed. If you would prefer to proceed without a companion, you may decline below with a personal acknowledgement.
          </p>

          {/* Companion Decline Option */}
          <div className="border-t border-amber-200 pt-4">
            <p className="text-xs font-semibold text-amber-800 mb-3">Companion Preference:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  update('waiver_action', null);
                  update('companion_requirement_status', 'pending');
                }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${!waiverDeclined ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-border hover:border-emerald-300'}`}
              >
                ✅ I welcome a companion
              </button>
              <button
                type="button"
                onClick={() => {
                  update('waiver_action', 'decline');
                  update('companion_requirement_status', 'companion_required_pending');
                }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${waiverDeclined ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-border hover:border-amber-300'}`}
              >
                I prefer to travel solo
              </button>
            </div>

            {/* Waiver Fields — shown only if declining */}
            {waiverDeclined && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">
                    Declining a companion for your journey is your right. Please provide a brief reason so our team can note it for your file.
                  </p>
                </div>
                <div>
                  <Label>Who is declining the companion? <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.declined_by || ''}
                    onChange={e => update('declined_by', e.target.value)}
                    placeholder="Full name of person declining"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Relationship to patient</Label>
                  <Input
                    value={form.declined_relationship || ''}
                    onChange={e => update('declined_relationship', e.target.value)}
                    placeholder="e.g. Self, Spouse, Parent"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Reason for declining <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.declined_reason || ''}
                    onChange={e => update('declined_reason', e.target.value)}
                    placeholder="Please briefly explain your preference to travel without a companion..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div className={`rounded-xl border p-3 ${!form.waiver_acknowledged ? 'border-amber-300 bg-white' : 'border-emerald-400 bg-emerald-50'}`}>
                  <button
                    type="button"
                    onClick={() => update('waiver_acknowledged', !form.waiver_acknowledged)}
                    className="flex items-start gap-3 w-full text-left"
                  >
                    {form.waiver_acknowledged
                      ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      : <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
                    <span className="text-xs text-foreground leading-relaxed">
                      I understand that a travel companion has been recommended for my care journey. I acknowledge this recommendation and choose to proceed without a dedicated companion. I accept personal responsibility for my own travel and recovery support. <span className="text-destructive">*</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safe message when no companion required */}
      {!showCompanionCard && age !== null && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800">Your profile meets standard eligibility for an unaccompanied care journey. You are welcome to bring a companion of your choice.</p>
        </div>
      )}

      {/* Solo Traveler Notice */}
      {!showCompanionCard && !waiverDeclined && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Radio className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm mb-1">Solo Traveler Safety Protocol</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              As you're traveling alone, mandatory safety check-ins will be activated for your journey. You'll receive notifications every 12 hours to confirm you're safe. This cannot be disabled but can be paused during medical procedures.
            </p>
          </div>
        </div>
      )}

      {/* Missing DOB warning */}
      {showValidation && !form.date_of_birth && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">Date of birth is required to complete your intake.</p>
        </div>
      )}
    </div>
  );
}