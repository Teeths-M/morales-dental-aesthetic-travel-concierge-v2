import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Utensils, AlertCircle, CheckCircle, Loader2, Sparkles, Heart } from 'lucide-react';

const CUISINE_LABELS = {
  latin_caribbean: '🌴 Latin / Caribbean', north_american: '🍔 North American',
  mediterranean: '🫒 Mediterranean', asian: '🥢 Asian',
  middle_eastern: '🥙 Middle Eastern', african: '🌍 African',
  european: '🥐 European', vegetarian_focused: '🥗 Vegetarian Focused',
  no_preference: '✅ No Preference',
};

const RESTRICTION_LABELS = {
  none: '✅ No restrictions',
  vegetarian: '🥗 Vegetarian',
  vegan: '🌱 Vegan',
  gluten_free: '🌾 Gluten Free',
  halal: '☪️ Halal',
  kosher: '✡️ Kosher',
  diabetic_low_sugar: '🩸 Diabetic / Low Sugar',
  low_sodium: '🧂 Low Sodium',
  other: '📝 Other (see details)',
};

export default function DietaryInfoCard({ caseId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dietary_profile', caseId],
    // base44.asServiceRole throws in the browser (no serviceToken client-side) —
    // React Query caught the error at the query layer, so this always rendered
    // "No dietary profile has been submitted" even when a real profile with
    // allergies existed. Scoped server-side to the companion's own assignment.
    queryFn: async () => (await base44.functions.invoke('getCompanionDietaryProfile', { case_id: caseId }))?.data,
    enabled: !!caseId,
  });

  const profile = data?.profile;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading dietary information...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <p>No dietary profile has been submitted for this patient yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Utensils className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm text-foreground">Patient Dietary & Allergy Information</h4>
        {profile.companion_acknowledged_at && (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-auto">
            <CheckCircle className="w-3 h-3 mr-1" />
            Acknowledged
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Dietary Restriction */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <span className="text-xs text-muted-foreground font-medium">Dietary Restriction</span>
          <span className="text-sm font-semibold">{RESTRICTION_LABELS[profile.dietary_restrictions] || profile.dietary_restrictions}</span>
        </div>

        {profile.dietary_restrictions_details && (
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Additional details:</p>
            <p className="text-sm">{profile.dietary_restrictions_details}</p>
          </div>
        )}

        {/* Food Allergies */}
        {profile.has_food_allergies && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">FOOD ALLERGY ALERT</p>
              <p className="text-sm text-red-800 mt-0.5">{profile.food_allergies_details}</p>
            </div>
          </div>
        )}

        {/* Medication Allergies */}
        {profile.has_medication_allergies && (
          <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-orange-700">MEDICATION ALLERGY ALERT</p>
              <p className="text-sm text-orange-800 mt-0.5">{profile.medication_allergies_details}</p>
            </div>
          </div>
        )}

        {/* Emergency Plan */}
        {profile.emergency_food_reaction_plan && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-1">Emergency Reaction Plan:</p>
            <p className="text-sm text-blue-800">{profile.emergency_food_reaction_plan}</p>
          </div>
        )}

        {/* No issues */}
        {!profile.has_food_allergies && !profile.has_medication_allergies && profile.dietary_restrictions === 'none' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-800">No food allergies, medication allergies, or dietary restrictions reported.</p>
          </div>
        )}
      </div>

      {/* ── RECOVERY MEAL PLAN (companion brief) ── */}
      {(profile.preferred_cuisine || profile.recovery_comfort_foods || profile.companion_meal_notes || profile.ai_recovery_meal_plan) && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <h5 className="font-semibold text-sm text-foreground">Recovery Meal Brief for You</h5>
          </div>

          {profile.preferred_cuisine && (
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="text-xs text-muted-foreground font-medium">Preferred Cuisine</span>
              <span className="text-sm font-semibold">{CUISINE_LABELS[profile.preferred_cuisine] || profile.preferred_cuisine}</span>
            </div>
          )}

          {profile.recovery_comfort_foods && (
            <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-xs font-semibold text-pink-700 mb-1">🍽️ Comfort Foods They Love</p>
              <p className="text-sm text-pink-800">{profile.recovery_comfort_foods}</p>
            </div>
          )}

          {profile.companion_meal_notes && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1">📋 Special Requests for You</p>
              <p className="text-sm text-blue-800">{profile.companion_meal_notes}</p>
            </div>
          )}

          {profile.ai_recovery_meal_plan && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">AI Recovery Nutrition Plan</p>
              </div>
              <div className="text-sm text-emerald-800 whitespace-pre-line leading-relaxed">{profile.ai_recovery_meal_plan}</div>
            </div>
          )}
        </div>
      )}

      {!profile.companion_acknowledged_at && (
        <p className="text-xs text-amber-600 font-medium">⚠️ Please confirm the dietary handshake to acknowledge you have received and understood this information.</p>
      )}
    </div>
  );
}