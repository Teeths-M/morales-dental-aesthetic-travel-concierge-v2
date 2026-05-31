import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Clock, Upload, Trash2, AlertCircle } from 'lucide-react';
import DoctorPortfolio from '@/components/doctor-dashboard/DoctorPortfolio';
import DoctorPricingManager from '@/components/doctor-dashboard/DoctorPricingManager';
import DoctorAvailabilityCalendar from '@/components/doctor-dashboard/DoctorAvailabilityCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';

export default function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const { user: authUser } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = authUser?.isPreviewAdmin ? authUser : await base44.auth.me();
        setUser(currentUser);

        if (currentUser?.isPreviewAdmin) {
          const doctors = await base44.entities.Doctor.list('-updated_date', 1);
          const previewDoctor = doctors[0] || null;
          if (previewDoctor) {
            const doctorData = { ...previewDoctor, successful_procedures_count: previewDoctor.successful_procedures_count || 0 };
            setDoctor(doctorData);
            setFormData(doctorData);
            setSpecialties(await base44.entities.DoctorSpecialty.filter({ doctor_id: previewDoctor.id }));
            setPricing(await base44.entities.DoctorPricing.filter({ doctor_id: previewDoctor.id }));
          }
          return;
        }
        
        const response = await base44.functions.invoke('getMyDoctorProfile', {});
        
        if (response.data.doctor) {
          const doctorData = { ...response.data.doctor, successful_procedures_count: response.data.doctor.successful_procedures_count || 0 };
          setDoctor(doctorData);
          setFormData(doctorData);
          setSpecialties(response.data.specialties || []);
          setPricing(response.data.pricing || []);
        }
      } catch (error) {
        console.error('Failed to load doctor profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [authUser]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    }
  };

  const handleSave = async () => {
    try {
      const updateData = {
        ...formData,
        successful_procedures_count: formData.successful_procedures_count !== undefined ? parseInt(formData.successful_procedures_count) || 0 : 0
      };
      await base44.entities.Doctor.update(doctor.id, updateData);
      setDoctor({ ...doctor, ...updateData });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove your profile? This action cannot be undone.')) {
      try {
        await base44.entities.Doctor.delete(doctor.id);
        setDoctor(null);
      } catch (error) {
        console.error('Failed to delete profile:', error);
        alert('Failed to delete profile. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Doctor Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              Your account ({user?.email}) is not registered as a doctor in our system.
            </p>
            <a href="/doctor-signup" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
              Create Doctor Profile
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-foreground">My Dashboard</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Secure Access</span>
          </div>
          <p className="text-muted-foreground">Manage your profile, specialties, and pricing information</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Logged in as: {user?.email}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border px-8 pt-6">
              <TabsList className="mb-0">
                <TabsTrigger value="profile">My Profile</TabsTrigger>
                <TabsTrigger value="availability">Availability Calendar</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="pricing">My Pricing</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {editing ? (
                    <label className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center cursor-pointer hover:bg-secondary/70 transition-colors group relative">
                      {formData.photo_url && formData.photo_url.trim() ? (
                        <img src={formData.photo_url} alt={formData.full_name} className="w-full h-full rounded-full object-cover" />
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
                      {formData.photo_url && formData.photo_url.trim() ? (
                        <img src={formData.photo_url} alt={formData.full_name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      ) : null}
                      {!formData.photo_url || !formData.photo_url.trim() ? (
                        formData.full_name?.charAt(0) || 'D'
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-lg font-bold"
                        placeholder="Full Name"
                      />
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Email"
                      />
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Phone Number"
                      />
                      <input
                        type="text"
                        value={formData.clinic_name || ''}
                        onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Clinic Name"
                      />
                      <input
                        type="text"
                        value={formData.clinic_country || ''}
                        onChange={(e) => setFormData({ ...formData, clinic_country: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Clinic Country"
                      />
                      <input
                        type="number"
                        value={formData.years_experience || ''}
                        onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Years of Experience"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.rating || ''}
                        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Rating (0-5)"
                      />
                      <input
                        type="number"
                        value={formData.review_count || ''}
                        onChange={(e) => setFormData({ ...formData, review_count: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Number of Reviews"
                      />
                      <input
                        type="number"
                        value={formData.successful_procedures_count || ''}
                        onChange={(e) => setFormData({ ...formData, successful_procedures_count: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Successful Procedures Completed"
                      />
                      <textarea
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        rows="3"
                        placeholder="Bio (1-2 sentences)"
                      />
                      <textarea
                        value={formData.professional_background || ''}
                        onChange={(e) => setFormData({ ...formData, professional_background: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        rows="3"
                        placeholder="Professional Background (education, certifications, credentials)"
                      />
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSave}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditing(false)}
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
                            <h2 className="text-2xl font-bold text-foreground">{formData.full_name}</h2>
                            {specialties.length > 0 && (
                              <p className="text-muted-foreground mt-1">{specialties[0].category || 'Specialist'}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditing(true)}
                              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary/20"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={handleDelete}
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
                        {formData.years_experience && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formData.years_experience}+ Years</span>
                          </div>
                        )}
                        {formData.rating && (
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{formData.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {formData.review_count !== undefined && (
                          <div className="px-3 py-1 bg-secondary rounded-full text-sm font-medium text-foreground">
                            {formData.review_count} Review{formData.review_count !== 1 ? 's' : ''}
                          </div>
                        )}
                        {formData.successful_procedures_count !== undefined && (
                          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                            {formData.successful_procedures_count} Procedure{formData.successful_procedures_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {formData.bio && (
                        <p className="text-foreground mb-4 leading-relaxed">{formData.bio}</p>
                      )}

                      {/* Credentials */}
                      <div className="mb-6">
                        <h4 className="font-bold text-foreground mb-3">Credentials & Certifications</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-3">
                            <span className="text-primary mt-1">•</span>
                            <span>{formData.clinic_name || 'Professional Clinic'}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-primary mt-1">•</span>
                            <span>Licensed in {formData.clinic_country}</span>
                          </li>
                          {formData.professional_background && (
                            <li className="flex items-start gap-3">
                              <span className="text-primary mt-1">•</span>
                              <span>{formData.professional_background}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Specialties */}
                      {specialties.length > 0 && (
                        <div>
                          <h4 className="font-bold text-foreground mb-3">Areas of Expertise</h4>
                          <div className="flex flex-wrap gap-2">
                            {specialties.slice(0, 5).map(spec => (
                              <span
                                key={spec.id}
                                className="px-3 py-1.5 bg-secondary text-foreground text-sm font-medium rounded-full"
                              >
                                {spec.procedure_name}
                              </span>
                            ))}
                            {specialties.length > 5 && (
                              <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                                +{specialties.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="availability" className="p-8">
              <DoctorAvailabilityCalendar doctorEmail={doctor.email} doctorId={doctor.id} />
            </TabsContent>

            <TabsContent value="portfolio" className="p-8">
              <DoctorPortfolio doctorId={doctor.id} portfolio={doctor.portfolio} />
            </TabsContent>

            <TabsContent value="pricing" className="p-8">
              <DoctorPricingManager doctorId={doctor.id} language={doctor.language_preference || 'en'} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}