import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit2, Save, X, Star, Clock, MapPin, Upload, Trash2, Play, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';

export default function DoctorProfilesManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editData, setEditData] = useState({});
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [activeDoctorId, setActiveDoctorId] = useState(null);
  const [proceduresDialogOpen, setProceduresDialogOpen] = useState(false);
  const [activeDoctorForProcedures, setActiveDoctorForProcedures] = useState(null);
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin_all_doctors'],
    queryFn: async () => {
      const doctorsList = await base44.entities.Doctor.list();
      // Fetch specialties count for each doctor
      const doctorsWithCount = await Promise.all(
        doctorsList.map(async (doctor) => {
          const specialties = await base44.entities.DoctorSpecialty.filter({ doctor_id: doctor.id });
          return { ...doctor, specialties_count: specialties.length };
        })
      );
      return doctorsWithCount;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Doctor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_doctors'] });
      setEditingDoctorId(null);
    },
  });

  // Mutation to update doctor specialties
  const updateSpecialtiesMutation = useMutation({
    mutationFn: async ({ doctorId, specialtyIds }) => {
      // First, get current specialties
      const currentSpecialties = await base44.entities.DoctorSpecialty.filter({ doctor_id: doctorId });
      const currentIds = currentSpecialties.map(s => s.id);
      
      // Remove specialties that are no longer selected
      const toRemove = currentIds.filter(id => !specialtyIds.includes(id));
      await Promise.all(toRemove.map(id => base44.entities.DoctorSpecialty.delete(id)));
      
      // Add new specialties (this would need a list of procedure IDs to create from)
      // For now, we just remove the ones that were deselected
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_doctors'] });
    },
  });

  const handleEdit = (doctor) => {
    setEditingDoctorId(doctor.id);
    setEditData(doctor);
  };

  const handleCancel = () => {
    setEditingDoctorId(null);
    setEditData({});
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingDoctorId, data: editData });
  };

  const handleOpenPortfolio = (doctorId) => {
    setActiveDoctorId(doctorId);
    setPortfolioDialogOpen(true);
  };

  const handleOpenProcedures = (doctorId) => {
    setActiveDoctorForProcedures(doctorId);
    setProceduresDialogOpen(true);
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.clinic_country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl text-foreground">Doctor Profiles</h2>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Doctor List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDoctors.map((doctor, i) => {
            const isEditing = editingDoctorId === doctor.id;
            const data = isEditing ? editData : doctor;

            return (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-6 border-l-4 border-l-primary">
                  <div className="flex gap-6">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {data.photo_url && data.photo_url.trim() ? (
                        <img 
                          src={data.photo_url} 
                          alt={data.full_name} 
                          className="w-24 h-24 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                          {data.full_name?.charAt(0) || 'D'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          {isEditing ? (
                            <Input
                              value={data.full_name || ''}
                              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                              className="text-xl font-bold mb-1"
                            />
                          ) : (
                            <h3 className="text-xl font-bold text-foreground">{data.full_name}</h3>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {isEditing ? (
                              <Input
                                value={data.clinic_country || ''}
                                onChange={(e) => setEditData({ ...editData, clinic_country: e.target.value })}
                                className="h-6 text-xs"
                              />
                            ) : (
                              <span>{data.clinic_country}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="gap-1"
                              >
                                <Save className="w-4 h-4" />
                                {updateMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(doctor)}
                              className="gap-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Profile
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 mb-3">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                value={data.rating || ''}
                                onChange={(e) => setEditData({ ...editData, rating: parseFloat(e.target.value) || 0 })}
                                className="w-20 h-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <Input
                                type="number"
                                value={data.years_experience || ''}
                                onChange={(e) => setEditData({ ...editData, years_experience: parseInt(e.target.value) || 0 })}
                                className="w-20 h-8"
                              />
                              <span className="text-xs text-muted-foreground">years</span>
                            </div>
                          </>
                        ) : (
                          <>
                            {data.rating && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-bold">{data.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {data.years_experience && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{data.years_experience}+ Years</span>
                              </div>
                            )}
                            {data.review_count !== undefined && (
                              <Badge variant="secondary">{data.review_count} Reviews</Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Procedures Count */}
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Procedures:</span>
                        <Badge>{doctor.specialties_count || 0}</Badge>
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenProcedures(doctor.id)}
                            className="h-6 text-xs text-primary hover:text-primary"
                          >
                            <Edit2 className="w-3 h-3" />
                            Adjust
                          </Button>
                        )}
                      </div>

                      {/* Portfolio Section */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Portfolio:</span>
                            <Badge variant="secondary">{(data.portfolio || []).length} items</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPortfolio(doctor.id)}
                            className="gap-1 h-7 text-xs"
                          >
                            <Upload className="w-3 h-3" />
                            {isEditing ? 'Manage Photos/Videos' : 'View Portfolio'}
                          </Button>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          {isEditing ? (
                            <Input
                              value={data.email || ''}
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              className="h-8 mt-1"
                            />
                          ) : (
                            <p className="text-foreground font-medium">{data.email}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          {isEditing ? (
                            <Input
                              value={data.phone || ''}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              className="h-8 mt-1"
                            />
                          ) : (
                            <p className="text-foreground font-medium">{data.phone}</p>
                          )}
                        </div>
                        {isEditing && (
                          <>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Clinic Name:</span>
                              <Input
                                value={data.clinic_name || ''}
                                onChange={(e) => setEditData({ ...editData, clinic_name: e.target.value })}
                                className="h-8 mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Bio:</span>
                              <Input
                                value={data.bio || ''}
                                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                className="h-8 mt-1"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredDoctors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No doctors found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Portfolio Dialog */}
      <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Portfolio</DialogTitle>
          </DialogHeader>
          {activeDoctorId && (
            <DoctorPortfolioManager 
              doctorId={activeDoctorId} 
              onClose={() => setPortfolioDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Procedures Dialog */}
      <Dialog open={proceduresDialogOpen} onOpenChange={setProceduresDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust Procedures</DialogTitle>
          </DialogHeader>
          {activeDoctorForProcedures && (
            <DoctorProceduresManager 
              doctorId={activeDoctorForProcedures} 
              onClose={() => setProceduresDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline portfolio manager component for admin
function DoctorPortfolioManager({ doctorId, onClose }) {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load doctor data to get portfolio
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const doctor = await base44.entities.Doctor.get(doctorId);
        setPortfolioItems(doctor.portfolio || []);
      } catch (error) {
        console.error('Failed to load portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPortfolio();
  }, [doctorId]);

  const saveToDatabase = async (items) => {
    try {
      await base44.entities.Doctor.update(doctorId, { portfolio: items });
    } catch (err) {
      console.error('Failed to save portfolio:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const newItems = [...portfolioItems];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const isVideo = file.type.startsWith('video/');
        
        const newItem = {
          id: Date.now() + Math.random(),
          url: file_url,
          type: isVideo ? 'video' : 'image',
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploadedAt: new Date().toISOString(),
        };
        
        newItems.push(newItem);
      }
      setPortfolioItems(newItems);
      await saveToDatabase(newItems);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (itemId) => {
    const updated = portfolioItems.filter(item => item.id !== itemId);
    setPortfolioItems(updated);
    await saveToDatabase(updated);
  };

  const handleTitleUpdate = async (itemId, newTitle) => {
    const updated = portfolioItems.map(item =>
      item.id === itemId ? { ...item, title: newTitle } : item
    );
    setPortfolioItems(updated);
    await saveToDatabase(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Upload Photos & Videos</h3>
            <p className="text-sm text-muted-foreground">Showcase before/after results and procedures</p>
          </div>
        </div>
        
        <label className="block w-full">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-foreground mb-1">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, MP4, WebM up to 100MB</p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Portfolio Grid */}
      {portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolioItems.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              {/* Thumbnail */}
              <div className="relative w-full h-48 bg-secondary/50 flex items-center justify-center overflow-hidden">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </>
                )}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  {item.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {item.type === 'image' ? 'Photo' : 'Video'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleTitleUpdate(item.id, e.target.value)}
                  className="w-full px-2 py-1 border border-border rounded text-sm font-medium text-foreground bg-background"
                  placeholder="Add a title"
                />
                <p className="text-xs text-muted-foreground">
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="w-full px-3 py-2 border border-destructive/50 text-destructive text-sm font-medium rounded hover:bg-destructive/10 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No portfolio items yet. Start uploading!</p>
        </div>
      )}
    </div>
  );
}

// Procedures manager component for admin
function DoctorProceduresManager({ doctorId, onClose }) {
  const [doctorSpecialties, setDoctorSpecialties] = useState([]);
  const [allProcedures, setAllProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [specialties, procedures] = await Promise.all([
          base44.entities.DoctorSpecialty.filter({ doctor_id: doctorId }),
          base44.entities.MasterProcedure.list()
        ]);
        setDoctorSpecialties(specialties);
        setAllProcedures(procedures);
      } catch (error) {
        console.error('Failed to load procedures:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [doctorId]);

  const handleToggleProcedure = async (procedure) => {
    const existing = doctorSpecialties.find(s => s.procedure_id === procedure.procedure_id);
    
    if (existing) {
      // Remove
      await base44.entities.DoctorSpecialty.delete(existing.id);
      setDoctorSpecialties(doctorSpecialties.filter(s => s.id !== existing.id));
    } else {
      // Add
      const newSpecialty = await base44.entities.DoctorSpecialty.create({
        doctor_id: doctorId,
        procedure_id: procedure.procedure_id,
        procedure_name: procedure.en_name,
        category: procedure.category,
        expertise_level: 'intermediate'
      });
      setDoctorSpecialties([...doctorSpecialties, newSpecialty]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Invalidate the doctors query to refresh the count
    onClose();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select the procedures this doctor offers. Currently offering {doctorSpecialties.length} procedure(s).
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
        {allProcedures.map(procedure => {
          const isSelected = doctorSpecialties.some(s => s.procedure_id === procedure.procedure_id);
          return (
            <button
              key={procedure.procedure_id}
              onClick={() => handleToggleProcedure(procedure)}
              className={`p-4 rounded-lg border text-left transition-all ${
                isSelected 
                  ? 'bg-primary/10 border-primary text-foreground' 
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{procedure.en_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{procedure.category}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}