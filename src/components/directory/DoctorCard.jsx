import React from 'react';
import { MapPin, Star, Stethoscope, Clock, Award } from 'lucide-react';
import TrustBadge from './TrustBadge';
import DoctorVerifiedBadge from '@/components/doctor/DoctorVerifiedBadge';

const SPECIALTY_COLORS = {
  dental: 'bg-blue-50 text-blue-700',
  aesthetic: 'bg-pink-50 text-pink-700',
  bariatric: 'bg-orange-50 text-orange-700',
  orthopedic: 'bg-indigo-50 text-indigo-700',
  fertility: 'bg-purple-50 text-purple-700',
  default: 'bg-emerald-50 text-emerald-700',
};

function getSpecialtyColor(specialty = '') {
  const s = specialty.toLowerCase();
  for (const key of Object.keys(SPECIALTY_COLORS)) {
    if (s.includes(key)) return SPECIALTY_COLORS[key];
  }
  return SPECIALTY_COLORS.default;
}

export default function DoctorCard({ doctor }) {
  const initials = (doctor.full_name || 'D')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {doctor.photo_url ? (
              <img src={doctor.photo_url} alt={doctor.full_name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <span className="text-primary font-display font-bold text-lg">{initials}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{doctor.full_name}</h3>
            {doctor.clinic_name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doctor.clinic_name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <TrustBadge status={doctor.verification_status} />
              <DoctorVerifiedBadge doctorId={doctor.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-3">
        {/* Specialty */}
        {doctor.specialty && (
          <div className="flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSpecialtyColor(doctor.specialty)}`}>
              {doctor.specialty}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{[doctor.clinic_city, doctor.clinic_country].filter(Boolean).join(', ') || 'Location not specified'}</span>
        </div>

        {/* Years of Experience */}
        {doctor.years_experience > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{doctor.years_experience} years of experience</span>
          </div>
        )}

        {/* Rating */}
        {doctor.rating > 0 && (
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 fill-amber-400" />
            <span className="text-xs font-semibold text-foreground">{Number(doctor.rating).toFixed(1)}</span>
            {doctor.review_count > 0 && (
              <span className="text-xs text-muted-foreground">({doctor.review_count} reviews)</span>
            )}
          </div>
        )}

        {/* Successful procedures */}
        {doctor.successful_procedures_count > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="w-3.5 h-3.5 flex-shrink-0 text-accent" />
            <span>{doctor.successful_procedures_count} successful procedures</span>
          </div>
        )}

        {/* Bio snippet */}
        {doctor.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pt-1 border-t border-border/40">
            {doctor.bio}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <a
          href="/consultation"
          className="block w-full text-center bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-all"
        >
          Book Consultation
        </a>
      </div>
    </div>
  );
}