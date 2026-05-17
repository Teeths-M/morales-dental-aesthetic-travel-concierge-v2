import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit2, Save, X, Star, Clock, MapPin } from 'lucide-react';

export default function DoctorProfilesManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin_all_doctors'],
    queryFn: () => base44.entities.Doctor.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Doctor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_doctors'] });
      setEditingDoctorId(null);
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
    </div>
  );
}