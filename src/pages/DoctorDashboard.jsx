import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Clock, Upload, Trash2 } from 'lucide-react';

export default function DoctorDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

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

  const handleEditStart = (doctor) => {
    setEditingId(doctor.id);
    setFormData(doctor);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    }
  };

  const handleSave = async () => {
    await base44.entities.Doctor.update(editingId, formData);
    setEditingId(null);
    setDoctors(doctors.map(d => d.id === editingId ? { ...d, ...formData } : d));
  };

  const handleDelete = async (doctorId) => {
    if (confirm('Are you sure you want to remove this profile?')) {
      await base44.entities.Doctor.delete(doctorId);
      setDoctors(doctors.filter(d => d.id !== doctorId));
    }
  };

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Manage your profile information displayed to clients</p>
        </div>

        <div className="space-y-6">
          {doctors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg">
              No doctor profiles yet.
            </div>
          ) : (
            doctors.map(doctor => {
              const isEditing = editingId === doctor.id;
              const doctorSpecs = specialties[doctor.id] || [];
              const data = isEditing ? formData : doctor;

              return (
                <div key={doctor.id} className="bg-card border border-border rounded-xl p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {isEditing ? (
                        <label className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center cursor-pointer hover:bg-secondary/70 transition-colors group relative">
                          {data.photo_url && data.photo_url.trim() ? (
                            <img src={data.photo_url} alt={data.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                              <p className="text-xs text-muted-foreground font-medium">Upload Photo</p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden flex-shrink-0">
                          {data.photo_url && data.photo_url.trim() ? (
                            <img src={data.photo_url} alt={data.full_name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                          ) : null}
                          {!data.photo_url || !data.photo_url.trim() ? (
                            data.full_name?.charAt(0) || 'D'
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <input
                            type="text"
                            value={data.full_name || ''}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-lg font-bold"
                            placeholder="Full Name"
                          />
                          <input
                            type="number"
                            value={data.years_experience || ''}
                            onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                            placeholder="Years of Experience"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={data.rating || ''}
                            onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                            placeholder="Rating (0-5)"
                          />
                          <textarea
                            value={data.bio || ''}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            rows="3"
                            placeholder="Bio (1-2 sentences)"
                          />
                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={handleSave}
                              className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-secondary/20"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h2 className="text-2xl font-bold text-foreground">{data.full_name}</h2>
                                {doctorSpecs.length > 0 && (
                                  <p className="text-muted-foreground mt-1">{doctorSpecs[0].category || 'Specialist'}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditStart(doctor)}
                                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary/20"
                                >
                                  Edit Profile
                                </button>
                                <button
                                  onClick={() => handleDelete(doctor.id)}
                                  className="px-3 py-2 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10"
                                  title="Delete profile"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-border">
                            {data.years_experience && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{data.years_experience}+ Years</span>
                              </div>
                            )}
                            {data.rating && (
                              <div className="flex items-center gap-2 text-sm">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-bold">{data.rating.toFixed(1)}</span>
                                <span className="text-muted-foreground">({data.review_count || 0})</span>
                              </div>
                            )}
                          </div>

                          {/* Bio */}
                          {data.bio && (
                            <p className="text-foreground mb-4 leading-relaxed">{data.bio}</p>
                          )}

                          {/* Credentials */}
                          <div className="mb-6">
                            <h4 className="font-bold text-foreground mb-3">Credentials & Certifications</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">•</span>
                                <span>{data.clinic_name || 'Professional Clinic'}</span>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="text-primary mt-1">•</span>
                                <span>Licensed in {data.clinic_country}</span>
                              </li>
                            </ul>
                          </div>

                          {/* Specialties */}
                          {doctorSpecs.length > 0 && (
                            <div>
                              <h4 className="font-bold text-foreground mb-3">Areas of Expertise</h4>
                              <div className="flex flex-wrap gap-2">
                                {doctorSpecs.slice(0, 5).map(spec => (
                                  <span
                                    key={spec.id}
                                    className="px-3 py-1.5 bg-secondary text-foreground text-sm font-medium rounded-full"
                                  >
                                    {spec.procedure_name}
                                  </span>
                                ))}
                                {doctorSpecs.length > 5 && (
                                  <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                                    +{doctorSpecs.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
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