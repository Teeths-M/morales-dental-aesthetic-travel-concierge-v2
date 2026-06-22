import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Plane, Car, Calendar, MapPin, Clock, Star, CheckCircle, Mail, Phone,
  Globe, User, Shield, Heart, ArrowLeft, Package, CreditCard, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { BackButton } from '@/components/nav/BackButton';

export default function TripOverview() {
  const [user, setUser] = useState(null);
  const [travelRequests, setTravelRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      loadTravelRequests();
    }
  }, [user]);

  const loadTravelRequests = async () => {
    try {
      const requests = await base44.entities.TravelRequest.filter(
        { user_email: user.email },
        '-created_date',
        10
      );

      // Enrich with partner data
      const enriched = await Promise.all(
        requests.map(async (req) => {
          const enrichedReq = { ...req };

          // Load travel agency
          if (req.travel_agency_id) {
            try {
              const agency = await base44.entities.TravelAgency.get(req.travel_agency_id);
              enrichedReq.travel_agency = agency;
            } catch (e) {
              console.error('Failed to load agency:', e);
            }
          }

          // Load chauffeur
          if (req.chauffeur_id) {
            try {
              const taxi = await base44.entities.TaxiService.get(req.chauffeur_id);
              enrichedReq.chauffeur = taxi;
            } catch (e) {
              console.error('Failed to load taxi:', e);
            }
          }

          // Load companion
          if (req.companion_id) {
            try {
              const companion = await base44.entities.Companion.get(req.companion_id);
              enrichedReq.companion = companion;
            } catch (e) {
              console.error('Failed to load companion:', e);
            }
          }

          return enrichedReq;
        })
      );

      setTravelRequests(enriched);
      if (enriched.length > 0) {
        setSelectedTrip(enriched[0]);
      }
    } catch (err) {
      console.error('Error loading travel requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
      pricing_requested: { label: 'Pricing Requested', color: 'bg-blue-100 text-blue-700' },
      quote_sent: { label: 'Quote Sent', color: 'bg-amber-100 text-amber-700' },
      deposit_paid: { label: 'Deposit Paid', color: 'bg-emerald-100 text-emerald-700' },
      fully_paid: { label: 'Fully Paid', color: 'bg-emerald-600 text-white' },
      confirmed: { label: 'Confirmed', color: 'bg-emerald-600 text-white' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
    };
    const cfg = configs[status] || configs.draft;
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading your trip details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (travelRequests.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar />
        <main className="flex-1 p-8 max-w-4xl">
          <BackButton fallback="/dashboard" className="mb-6" />
          <Card className="bg-white border-slate-200 rounded-2xl p-8 text-center">
            <Plane className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-slate-800 mb-2">No Trips Yet</h2>
            <p className="text-slate-500 mb-6">You haven't booked any travel services yet.</p>
            <Link to="/travel-concierge">
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6">
                Book Your First Trip
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl"
        >
          <BackButton fallback="/dashboard" className="mb-6" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-slate-900">My Trip Overview</h1>
              <p className="text-sm text-slate-500">Your complete travel itinerary and verified partners</p>
            </div>
          </div>

          {/* Trip Selection Tabs */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {travelRequests.map((trip, idx) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedTrip?.id === trip.id
                      ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {trip.destination_city}, {trip.destination_country}
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {new Date(trip.departure_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedTrip && (
            <>
              {/* Trip Summary Card */}
              <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusBadge(selectedTrip.package_status)}
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedTrip.departure_date).toLocaleDateString([], { dateStyle: 'medium' })}
                        {selectedTrip.return_date && (
                          <>
                            {' '}→ {new Date(selectedTrip.return_date).toLocaleDateString([], { dateStyle: 'medium' })}
                          </>
                        )}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl text-slate-900 mb-2">
                      {selectedTrip.origin_city} → {selectedTrip.destination_city}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {selectedTrip.travelers_count} traveler{selectedTrip.travelers_count > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Plane className="w-4 h-4" />
                        {selectedTrip.travel_class.replace('_', ' ').toUpperCase()}
                      </span>
                      {selectedTrip.hotel_required && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {selectedTrip.hotel_star_rating}-Star Hotel
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Total Package Price</p>
                    <p className="text-3xl font-bold text-emerald-700">
                      {formatCurrency(selectedTrip.total_package_price || 0)}
                    </p>
                    {selectedTrip.amount_paid > 0 && (
                      <p className="text-xs text-slate-600 mt-1">
                        Paid: {formatCurrency(selectedTrip.amount_paid)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Partners Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <Shield className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-lg">Your Verified Travel Partners</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Travel Agency */}
                  {selectedTrip.travel_agency && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/30 h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                                <Plane className="w-6 h-6 text-emerald-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-lg">
                                  {selectedTrip.travel_agency.agency_name}
                                </h4>
                                <p className="text-xs text-emerald-300/80">Travel Agency</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold text-white">
                              {selectedTrip.travel_agency.rating?.toFixed(1) || '5.0'}
                            </span>
                            <span className="text-xs text-white/50">• {selectedTrip.travel_agency.medical_travel_experience_years} years experience</span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {selectedTrip.travel_agency.email && (
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <Mail className="w-4 h-4 text-emerald-400" />
                                <span>{selectedTrip.travel_agency.email}</span>
                              </div>
                            )}
                            {selectedTrip.travel_agency.phone && (
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <Phone className="w-4 h-4 text-emerald-400" />
                                <span>{selectedTrip.travel_agency.phone}</span>
                              </div>
                            )}
                            {selectedTrip.travel_agency.website_url && (
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                <a href={selectedTrip.travel_agency.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  Visit Website
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {selectedTrip.travel_agency.services_offered?.slice(0, 4).map((service, idx) => (
                              <Badge key={idx} className="bg-emerald-500/10 text-emerald-300 border-emerald-400/20 text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>

                          <p className="text-xs text-white/60 leading-relaxed">
                            Your primary travel concierge handling flights, accommodation, and ground transportation coordination.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Taxi/Chauffeur Service */}
                  {selectedTrip.chauffeur && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/30 h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                                <Car className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-lg">
                                  {selectedTrip.chauffeur.company_name || selectedTrip.chauffeur.driver_name}
                                </h4>
                                <p className="text-xs text-blue-300/80">Ground Transportation</p>
                              </div>
                            </div>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold text-white">
                              {selectedTrip.chauffeur.quality_score?.toFixed(1) || '5.0'}
                            </span>
                            <span className="text-xs text-white/50">• {selectedTrip.chauffeur.total_trips || 0} trips</span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {selectedTrip.chauffeur.email && (
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <Mail className="w-4 h-4 text-blue-400" />
                                <span>{selectedTrip.chauffeur.email}</span>
                              </div>
                            )}
                            {selectedTrip.chauffeur.phone && (
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <Phone className="w-4 h-4 text-blue-400" />
                                <span>{selectedTrip.chauffeur.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-white/80">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span>{selectedTrip.chauffeur.operating_city}, {selectedTrip.chauffeur.operating_country}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {selectedTrip.chauffeur.vehicle_types?.slice(0, 3).map((type, idx) => (
                              <Badge key={idx} className="bg-blue-500/10 text-blue-300 border-blue-400/20 text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>

                          <p className="text-xs text-white/60 leading-relaxed">
                            Professional chauffeur service for airport transfers and local transportation during your stay.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Companion Service */}
                  {selectedTrip.companion && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="md:col-span-2"
                    >
                      <Card className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 border-violet-500/30">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-400/40 flex items-center justify-center">
                                <Heart className="w-6 h-6 text-violet-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-lg">
                                  {selectedTrip.companion.name}
                                </h4>
                                <p className="text-xs text-violet-300/80">
                                  {selectedTrip.companion_type?.replace('_', ' ').toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-violet-500/20 text-violet-300 border-violet-400/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                                <Mail className="w-4 h-4 text-violet-400" />
                                <span>{selectedTrip.companion.email}</span>
                              </div>
                              {selectedTrip.companion.phone && (
                                <div className="flex items-center gap-2 text-sm text-white/80">
                                  <Phone className="w-4 h-4 text-violet-400" />
                                  <span>{selectedTrip.companion.phone}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-white/70 mb-2">
                                {selectedTrip.companion.specialties?.join(' • ') || 'Professional care companion'}
                              </p>
                              <p className="text-xs text-white/60">
                                Duration: {selectedTrip.companion_days || selectedTrip.companion.duration_days} days
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {!selectedTrip.travel_agency && !selectedTrip.chauffeur && !selectedTrip.companion && (
                    <Card className="bg-white border-slate-200 rounded-2xl p-8 text-center md:col-span-2">
                      <div className="animate-pulse">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-semibold">Matching you with verified partners...</p>
                        <p className="text-sm text-slate-500 mt-1">
                          We're finding the best travel professionals for your journey
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Additional Services */}
              {(selectedTrip.hotel_required || selectedTrip.transfer_required) && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-5">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-lg">Included Services</h3>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {selectedTrip.hotel_required && (
                      <Card className="bg-white border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Hotel Booking</p>
                            <p className="text-xs text-slate-500">{selectedTrip.hotel_star_rating}-star • {selectedTrip.hotel_room_type}</p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {selectedTrip.transfer_required && (
                      <Card className="bg-white border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Car className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Airport Transfer</p>
                            <p className="text-xs text-slate-500">{selectedTrip.transfer_type.toUpperCase()}</p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {selectedTrip.companion_required && (
                      <Card className="bg-white border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Travel Companion</p>
                            <p className="text-xs text-slate-500">{selectedTrip.companion_days} days</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Support CTA */}
              <Card className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-display text-xl mb-2">Need Assistance?</h3>
                    <p className="text-white/70 text-sm">
                      Our travel specialists are available 24/7 to help with any questions or changes.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link to="/dashboard/messages">
                      <Button className="bg-white text-slate-900 hover:bg-white/90 rounded-xl px-5">
                        <Mail className="w-4 h-4 mr-2" />
                        Message Support
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}