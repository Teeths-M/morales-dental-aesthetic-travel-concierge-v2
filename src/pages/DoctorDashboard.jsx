import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Calendar, Award } from 'lucide-react';

export default function DoctorDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Doctor.list(),
      base44.entities.DoctorSpecialty.list('-created_date', 1000)
    ])
      .then(([doctorList, specialtyList]) => {
        setDoctors(doctorList || []);
        const specialtyMap = {};
        (specialtyList || []).forEach(spec => {
          if (!specialtyMap[spec.doctor_id]) {
            specialtyMap[spec.doctor_id] = [];
          }
          specialtyMap[spec.doctor_id].push(spec);
        });
        setSpecialties(specialtyMap);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">✨ Expert Medical Specialists</h1>
          <p className="text-lg text-muted-foreground">Highly accredited doctors — transparent experience, genuine ratings & clinical excellence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No doctors available yet.
            </div>
          ) : (
            doctors.map(doctor => {
              const doctorSpecs = specialties[doctor.id] || [];
              return (
                <div key={doctor.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
                  <div className="p-7 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-foreground">{doctor.full_name}</h3>
                      {doctorSpecs.length > 0 && (
                        <span className="inline-block text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
                          {doctorSpecs[0].category || 'Specialist'}
                        </span>
                      )}
                    </div>

                    {/* Meta Row */}
                    <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-border">
                      {doctor.years_experience && (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium text-green-700">
                          <Calendar className="w-4 h-4" />
                          {doctor.years_experience}+ years
                        </div>
                      )}
                      {doctor.rating && (
                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full text-sm font-medium">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-amber-700 font-bold">{doctor.rating.toFixed(1)}</span>
                          <span className="text-amber-700">/ 5</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {doctor.bio && (
                      <p className="text-sm text-foreground leading-relaxed mb-4 bg-secondary/30 p-3 rounded-lg">
                        {doctor.bio}
                      </p>
                    )}

                    {/* Clinic Info */}
                    <div className="mb-4">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Award className="w-3 h-3" /> Clinic Details
                      </div>
                      <div className="bg-secondary/20 px-3 py-2 rounded-lg text-sm text-foreground border-l-2 border-primary">
                        <p className="font-medium">{doctor.clinic_name || 'Professional Clinic'}</p>
                        <p className="text-muted-foreground text-xs mt-1">{doctor.clinic_country}</p>
                      </div>
                    </div>

                    {/* Specialties */}
                    {doctorSpecs.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                          📋 Areas of Expertise
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {doctorSpecs.map(spec => (
                            <span
                              key={spec.id}
                              className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full"
                            >
                              {spec.procedure_name || spec.category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Button */}
                    <div className="mt-6 pt-4">
                      <button className="w-full px-4 py-2.5 border border-primary text-primary font-semibold rounded-full bg-transparent hover:bg-primary/5 transition-colors text-sm">
                        View full profile & availability
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}