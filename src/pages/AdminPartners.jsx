import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Plane, Car, Search, Filter, Mail, Phone, MapPin, Star, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminPartners() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerType, setPartnerType] = useState('all');
  const [isApproving, setIsApproving] = useState(false);

  // Fetch all partner types
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['admin_doctors'],
    queryFn: async () => {
      const result = await base44.entities.Doctor.list('-created_date', 1000);
      console.log('Fetched doctors:', result);
      return result;
    },
  });

  const { data: travelAgencies = [], isLoading: loadingTravel } = useQuery({
    queryKey: ['admin_travel_agencies'],
    queryFn: async () => {
      const result = await base44.entities.TravelAgency.list('-created_date', 200);
      console.log('Fetched travel agencies:', result);
      return result;
    },
  });

  const { data: taxiServices = [], isLoading: loadingTaxi } = useQuery({
    queryKey: ['admin_taxi_services'],
    queryFn: async () => {
      const result = await base44.entities.TaxiService.list('-created_date', 200);
      console.log('Fetched taxi services:', result);
      return result;
    },
  });

  const getStatusBadge = (status) => {
    const configs = {
      'active': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Active' },
      'pending_verification': { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
      'inactive': { color: 'bg-slate-100 text-slate-700', icon: XCircle, label: 'Inactive' },
    };
    const config = configs[status] || configs['inactive'];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getRatingBadge = (rating) => {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200">
        <Star className="w-3 h-3 mr-1 fill-amber-500" />
        {rating?.toFixed(1) || 'N/A'}
      </Badge>
    );
  };

  const openPartnerDetails = (partner, type) => {
    setSelectedPartner({ ...partner, _type: type });
  };

  const handleApproveDoctor = async (doctorId) => {
    setIsApproving(true);
    try {
      await base44.entities.Doctor.update(doctorId, { 
        status: 'active',
        verification_status: 'verified'
      });
      toast.success('Doctor approved successfully');
      // Refresh the query
      await base44.entities.Doctor.list('-created_date', 200);
      window.location.reload();
    } catch (error) {
      console.error('Failed to approve doctor:', error);
      toast.error('Failed to approve doctor');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectDoctor = async (doctorId) => {
    setIsApproving(true);
    try {
      await base44.entities.Doctor.update(doctorId, { 
        status: 'rejected',
        verification_status: 'rejected'
      });
      toast.success('Doctor rejected');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reject doctor:', error);
      toast.error('Failed to reject doctor');
    } finally {
      setIsApproving(false);
    }
  };

  const stats = {
    doctors: doctors.length,
    travelAgencies: travelAgencies.length,
    taxiServices: taxiServices.length,
    active: [
      ...doctors.filter(d => d.status === 'active'),
      ...travelAgencies.filter(t => t.status === 'active'),
      ...taxiServices.filter(t => t.status === 'active'),
    ].length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" asChild className="rounded-full">
                <Link to="/admin">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Partner Management</h1>
                <p className="text-sm text-slate-500">View and manage all registered partners</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.doctors}</p>
                  <p className="text-xs text-slate-500">Doctors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.travelAgencies}</p>
                  <p className="text-xs text-slate-500">Travel Agencies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.taxiServices}</p>
                  <p className="text-xs text-slate-500">Taxi Services</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                  <p className="text-xs text-slate-500">Active Partners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search partners by name, email, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base"
            />
          </div>
        </div>

        {/* Partner Tabs */}
        <Tabs defaultValue="all" className="space-y-4" onValueChange={setPartnerType}>
          <TabsList className="bg-white rounded-2xl shadow-md border border-slate-100 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl">All Partners</TabsTrigger>
            <TabsTrigger value="doctors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl">Doctors</TabsTrigger>
            <TabsTrigger value="travel" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-xl">Travel Agencies</TabsTrigger>
            <TabsTrigger value="taxi" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-xl">Taxi Services</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <PartnerSection 
              title="Doctors" 
              icon={Users} 
              partners={doctors} 
              isLoading={loadingDoctors}
              type="doctor"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
            <PartnerSection 
              title="Travel Agencies" 
              icon={Plane} 
              partners={travelAgencies} 
              isLoading={loadingTravel}
              type="travel"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
            <PartnerSection 
              title="Taxi Services" 
              icon={Car} 
              partners={taxiServices} 
              isLoading={loadingTaxi}
              type="taxi"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <PartnerSection 
              title="Doctors" 
              icon={Users} 
              partners={doctors} 
              isLoading={loadingDoctors}
              type="doctor"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
          </TabsContent>

          <TabsContent value="travel" className="space-y-4">
            <PartnerSection 
              title="Travel Agencies" 
              icon={Plane} 
              partners={travelAgencies} 
              isLoading={loadingTravel}
              type="travel"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
          </TabsContent>

          <TabsContent value="taxi" className="space-y-4">
            <PartnerSection 
              title="Taxi Services" 
              icon={Car} 
              partners={taxiServices} 
              isLoading={loadingTaxi}
              type="taxi"
              searchTerm={searchTerm}
              getStatusBadge={getStatusBadge}
              getRatingBadge={getRatingBadge}
              openPartnerDetails={openPartnerDetails}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Partner Details Dialog */}
      {selectedPartner && (
        <PartnerDetailsDialog 
          partner={selectedPartner} 
          open={!!selectedPartner} 
          onOpenChange={() => setSelectedPartner(null)}
          onApprove={handleApproveDoctor}
          onReject={handleRejectDoctor}
          isApproving={isApproving}
        />
      )}
    </div>
  );
}

function PartnerSection({ title, icon: Icon, partners, isLoading, type, searchTerm, getStatusBadge, getRatingBadge, openPartnerDetails }) {
  const filteredPartners = partners.filter(partner => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    if (type === 'doctor' || type === 'all') {
      const match = (
        partner.full_name?.toLowerCase().includes(searchLower) ||
        partner.email?.toLowerCase().includes(searchLower) ||
        partner.clinic_country?.toLowerCase().includes(searchLower) ||
        partner.clinic_city?.toLowerCase().includes(searchLower)
      );
      console.log('Doctor filter check:', { name: partner.full_name, email: partner.email, searchLower, match });
      return match;
    }
    
    if (type === 'travel' || type === 'all') {
      return (
        partner.agency_name?.toLowerCase().includes(searchLower) ||
        partner.email?.toLowerCase().includes(searchLower) ||
        partner.headquarters_country?.toLowerCase().includes(searchLower)
      );
    }
    
    if (type === 'taxi' || type === 'all') {
      return (
        partner.company_name?.toLowerCase().includes(searchLower) ||
        partner.driver_name?.toLowerCase().includes(searchLower) ||
        partner.email?.toLowerCase().includes(searchLower) ||
        partner.operating_country?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-2xl">
        <CardContent className="pt-6 text-center py-8">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (filteredPartners.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-2xl">
        <CardContent className="pt-6 text-center py-8">
          <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No {title.toLowerCase()} found</p>
          <p className="text-sm text-slate-500">{searchTerm ? 'Try a different search term' : 'No partners registered yet'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-2xl">
      <CardContent className="pt-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-600" />
          {title} ({filteredPartners.length})
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map(partner => {
            // Determine the actual type for each partner when in 'all' view
            let actualType = type;
            if (type === 'all') {
              if (partner.full_name) actualType = 'doctor';
              else if (partner.agency_name) actualType = 'travel';
              else if (partner.company_name || partner.driver_name) actualType = 'taxi';
            }
            return (
              <PartnerCard 
                key={partner.id} 
                partner={partner} 
                type={actualType}
                getStatusBadge={getStatusBadge}
                getRatingBadge={getRatingBadge}
                onClick={() => openPartnerDetails(partner, actualType)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PartnerCard({ partner, type, getStatusBadge, getRatingBadge, onClick }) {
  const getName = () => {
    if (type === 'doctor') return partner.full_name || 'Unnamed Doctor';
    if (type === 'travel') return partner.agency_name || 'Unnamed Agency';
    if (type === 'taxi') return partner.company_name || partner.driver_name || 'Unnamed Service';
    return partner.name || 'Unnamed Partner';
  };

  const getLocation = () => {
    if (type === 'doctor') return `${partner.clinic_city || ''}, ${partner.clinic_country || ''}`.trim();
    if (type === 'travel') return partner.headquarters_country || 'Location unknown';
    if (type === 'taxi') return `${partner.operating_city || ''}, ${partner.operating_country || ''}`.trim();
    return 'Location unknown';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer rounded-xl"
        onClick={onClick}
      >
        <CardContent className="pt-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-slate-900 line-clamp-1">{getName()}</h4>
              {getRatingBadge(partner.rating)}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="line-clamp-1">{getLocation()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="line-clamp-1">{partner.email}</span>
              </div>
              
              {partner.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{partner.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {getStatusBadge(partner.status)}
              <span className="text-xs text-slate-500">
                {partner.created_date ? new Date(partner.created_date).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PartnerDetailsDialog({ partner, open, onOpenChange, onApprove, onReject, isApproving }) {
  if (!partner) return null;

  const renderDetails = () => {
    if (partner._type === 'doctor' || partner.full_name) {
      return (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <p className="text-slate-900">{partner.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <p className="text-slate-900">{partner.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <p className="text-slate-900">{partner.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Clinic Location</label>
              <p className="text-slate-900">{partner.clinic_city}, {partner.clinic_country}</p>
            </div>
            {partner.clinic_name && (
              <div>
                <label className="text-sm font-medium text-slate-700">Clinic Name</label>
                <p className="text-slate-900">{partner.clinic_name}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Years of Experience</label>
              <p className="text-slate-900">{partner.years_experience || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Language Preference</label>
              <p className="text-slate-900">{partner.language_preference?.toUpperCase() || 'EN'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payout Method</label>
              <p className="text-slate-900">{partner.payout_method || 'Not set'}</p>
            </div>
          </div>
          
          {partner.professional_background && (
            <div>
              <label className="text-sm font-medium text-slate-700">Professional Background</label>
              <p className="text-slate-900 mt-1">{partner.professional_background}</p>
            </div>
          )}
          
          {partner.bio && (
            <div>
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <p className="text-slate-900 mt-1">{partner.bio}</p>
            </div>
          )}
          
          {partner.portfolio && partner.portfolio.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Portfolio</label>
              <p className="text-slate-900 mt-1">{partner.portfolio.length} items</p>
            </div>
          )}
        </div>
      );
    }

    if (partner._type === 'travel' || partner.agency_name) {
      return (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Agency Name</label>
              <p className="text-slate-900">{partner.agency_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Contact Person</label>
              <p className="text-slate-900">{partner.contact_person || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <p className="text-slate-900">{partner.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <p className="text-slate-900">{partner.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Headquarters</label>
              <p className="text-slate-900">{partner.headquarters_country}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Years of Experience</label>
              <p className="text-slate-900">{partner.medical_travel_experience_years || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Language Preference</label>
              <p className="text-slate-900">{partner.language_preference?.toUpperCase() || 'EN'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payout Method</label>
              <p className="text-slate-900">{partner.payout_method || 'Not set'}</p>
            </div>
          </div>
          
          {partner.website_url && (
            <div>
              <label className="text-sm font-medium text-slate-700">Website</label>
              <p className="text-slate-900">{partner.website_url}</p>
            </div>
          )}
          
          {partner.service_regions && partner.service_regions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Service Regions</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {partner.service_regions.map((region, idx) => (
                  <Badge key={idx} variant="outline">{region}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {partner.services_offered && partner.services_offered.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Services Offered</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {partner.services_offered.map((service, idx) => (
                  <Badge key={idx} className="bg-blue-50 text-blue-700">{service}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (partner._type === 'taxi' || partner.operating_country) {
      return (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Company Name</label>
              <p className="text-slate-900">{partner.company_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Driver Name</label>
              <p className="text-slate-900">{partner.driver_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <p className="text-slate-900">{partner.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <p className="text-slate-900">{partner.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Operating Location</label>
              <p className="text-slate-900">{partner.operating_city}, {partner.operating_country}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Service Radius</label>
              <p className="text-slate-900">{partner.service_radius_km || 'N/A'} km</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Language Preference</label>
              <p className="text-slate-900">{partner.language_preference?.toUpperCase() || 'EN'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payout Method</label>
              <p className="text-slate-900">{partner.payout_method || 'Not set'}</p>
            </div>
          </div>
          
          {partner.vehicle_types && partner.vehicle_types.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Vehicle Types</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {partner.vehicle_types.map((type, idx) => (
                  <Badge key={idx} className="bg-amber-50 text-amber-700">{type}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {partner.patient_assistance && partner.patient_assistance.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Patient Assistance</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {partner.patient_assistance.map((assistance, idx) => (
                  <Badge key={idx} variant="outline">{assistance}</Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">License Verified</label>
              <p className="text-slate-900">{partner.license_verified ? '✓ Yes' : '✗ No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Insurance Verified</label>
              <p className="text-slate-900">{partner.insurance_verified ? '✓ Yes' : '✗ No'}</p>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-slate-600">No additional details available</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {partner.full_name || partner.agency_name || partner.company_name || partner.driver_name || 'Partner Details'}
          </DialogTitle>
          <DialogDescription>
            Complete partner information and status
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {renderDetails()}
          
          <DialogFooter className="pt-4 border-t border-slate-200">
            {(partner._type === 'doctor' || partner.full_name) && partner.status === 'pending_verification' && (
              <div className="flex gap-3 w-full">
                <Button
                  variant="destructive"
                  onClick={() => onReject(partner.id)}
                  disabled={isApproving}
                  className="flex-1"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => onApprove(partner.id)}
                  disabled={isApproving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isApproving ? 'Processing...' : 'Approve Doctor'}
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between w-full pt-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Registered on</p>
                <p className="text-slate-900 font-medium">
                  {partner.created_date ? new Date(partner.created_date).toLocaleString() : 'Unknown'}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-slate-500">Last Updated</p>
                <p className="text-slate-900 font-medium">
                  {partner.updated_date ? new Date(partner.updated_date).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}