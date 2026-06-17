import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Hotel, Car, Users, Calendar, MapPin, DollarSign, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/brandTokens';

const TRAVEL_CLASSES = [
  { value: 'economy', label: 'Economy', icon: '💺' },
  { value: 'premium_economy', label: 'Premium Economy', icon: '💺✨' },
  { value: 'business', label: 'Business Class', icon: '💼' },
  { value: 'first', label: 'First Class', icon: '👑' },
];

const HOTEL_STARS = [3, 4, 5];
const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'penthouse'];
const TRANSFER_TYPES = [
  { value: 'standard', label: 'Standard Sedan', icon: '🚗' },
  { value: 'luxury', label: 'Luxury Vehicle', icon: '🚙' },
  { value: 'vip', label: 'VIP Chauffeur', icon: '🏎️' },
];
const COMPANION_TYPES = [
  { value: 'tour_guide', label: 'Tour Guide', icon: '🗺️' },
  { value: 'care_companion', label: 'Care Companion', icon: '💕' },
  { value: 'luxury_concierge', label: 'Luxury Concierge', icon: '🥂' },
];

export default function TravelConcierge() {
  const { toast } = useToast();
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [formData, setFormData] = useState({
    origin_city: '',
    origin_country: '',
    destination_city: '',
    destination_country: '',
    departure_date: '',
    return_date: '',
    travelers_count: 1,
    travel_class: 'economy',
    hotel_required: true,
    hotel_star_rating: 4,
    hotel_room_type: 'deluxe',
    transfer_required: true,
    transfer_type: 'standard',
    companion_required: false,
    companion_type: 'tour_guide',
    companion_days: 0,
    special_requests: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculatePricing = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('calculateTravelPackagePrice', formData);
      setPricing(response.data);
      setStep('pricing');
      toast({
        title: 'Package Calculated',
        description: 'Your luxury travel package is ready for review.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createTravelRequest', formData);
      setStep('success');
      toast({
        title: 'Request Submitted!',
        description: `Your travel request ${response.data.request_token} has been created.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-blue-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="font-display text-4xl text-white mb-4" style={{ letterSpacing: '-0.02em' }}>Request Submitted</h1>
          <p className="text-white/80 text-lg mb-6">
            Your luxury travel concierge request has been received. Our team will contact you within 24 hours to finalize your itinerary.
          </p>
          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <p className="text-white/70 text-sm mb-2">Reference Token</p>
            <p className="text-white font-mono text-lg">TRAVEL_XXXXX</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-white text-emerald-900 hover:bg-white/90 h-12 px-8 rounded-xl font-semibold"
          >
            Return Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-blue-900 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </motion.button>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-5xl lg:text-6xl text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
            Luxury Travel Concierge
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Curated travel experiences with flights, hotels, private transfers, and personal companions
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Plane className="w-5 h-5" /> Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/90 text-sm">Origin City</Label>
                    <Input
                      value={formData.origin_city}
                      onChange={e => handleInputChange('origin_city', e.target.value)}
                      placeholder="e.g. New York"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm">Origin Country</Label>
                    <Input
                      value={formData.origin_country}
                      onChange={e => handleInputChange('origin_country', e.target.value)}
                      placeholder="e.g. United States"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/90 text-sm">Destination City</Label>
                    <Input
                      value={formData.destination_city}
                      onChange={e => handleInputChange('destination_city', e.target.value)}
                      placeholder="e.g. Paris"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm">Destination Country</Label>
                    <Input
                      value={formData.destination_country}
                      onChange={e => handleInputChange('destination_country', e.target.value)}
                      placeholder="e.g. France"
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/90 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Departure
                    </Label>
                    <Input
                      type="date"
                      value={formData.departure_date}
                      onChange={e => handleInputChange('departure_date', e.target.value)}
                      className="mt-1 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Return
                    </Label>
                    <Input
                      type="date"
                      value={formData.return_date}
                      onChange={e => handleInputChange('return_date', e.target.value)}
                      className="mt-1 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Travelers & Class */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/90 text-sm flex items-center gap-1">
                      <Users className="w-3 h-3" /> Travelers
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.travelers_count}
                      onChange={e => handleInputChange('travelers_count', parseInt(e.target.value))}
                      className="mt-1 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm">Travel Class</Label>
                    <Select value={formData.travel_class} onValueChange={v => handleInputChange('travel_class', v)}>
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAVEL_CLASSES.map(cls => (
                          <SelectItem key={cls.value} value={cls.value}>
                            {cls.icon} {cls.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Hotel */}
                {formData.hotel_required && (
                  <div className="space-y-3 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 text-white">
                      <Hotel className="w-5 h-5" />
                      <span className="font-semibold">Accommodation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/90 text-sm">Star Rating</Label>
                        <Select value={formData.hotel_star_rating.toString()} onValueChange={v => handleInputChange('hotel_star_rating', parseInt(v))}>
                          <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOTEL_STARS.map(stars => (
                              <SelectItem key={stars} value={stars.toString()}>
                                {'⭐'.repeat(stars)} ({stars}-Star)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white/90 text-sm">Room Type</Label>
                        <Select value={formData.hotel_room_type} onValueChange={v => handleInputChange('hotel_room_type', v)}>
                          <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_TYPES.map(type => (
                              <SelectItem key={type} value={type} className="capitalize">
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transfer */}
                {formData.transfer_required && (
                  <div className="space-y-3 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 text-white">
                      <Car className="w-5 h-5" />
                      <span className="font-semibold">Private Transfers</span>
                    </div>
                    <Select value={formData.transfer_type} onValueChange={v => handleInputChange('transfer_type', v)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFER_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.icon} {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Companion */}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-white">
                      <Users className="w-5 h-5" />
                      <span className="font-semibold">Personal Companion</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.companion_required}
                      onChange={e => handleInputChange('companion_required', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </div>
                  {formData.companion_required && (
                    <div className="space-y-3">
                      <Select value={formData.companion_type} onValueChange={v => handleInputChange('companion_type', v)}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANION_TYPES.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.icon} {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <Label className="text-white/90 text-sm">Number of Days</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.companion_days}
                          onChange={e => handleInputChange('companion_days', parseInt(e.target.value))}
                          className="mt-1 bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={step === 'pricing' ? handleSubmitRequest : handleCalculatePricing}
                  disabled={loading || !formData.origin_city || !formData.destination_city || !formData.departure_date}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold mt-6"
                >
                  {loading ? 'Processing...' : step === 'pricing' ? 'Submit Request' : 'Calculate Package Price'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing Section */}
          {pricing && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 sticky top-6">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Package Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-white/80">
                      <span>Flights</span>
                      <span className="font-semibold">${pricing.flight_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Hotel ({pricing.nights} nights)</span>
                      <span className="font-semibold">${pricing.hotel_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Transfers</span>
                      <span className="font-semibold">${pricing.transfer_cost.toLocaleString()}</span>
                    </div>
                    {pricing.companion_cost > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>Companion</span>
                        <span className="font-semibold">${pricing.companion_cost.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-white/80">
                        <span>Subtotal</span>
                        <span className="font-semibold">${pricing.base_cost.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-white/70 text-sm">
                      <span>Platform Fee (25%)</span>
                      <span>${(pricing.base_cost * 0.25).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-white text-lg font-bold">
                        <span>Total Package</span>
                        <span>${pricing.base_cost * 1.25.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4">
                      <div className="flex justify-between text-emerald-100">
                        <span className="font-semibold">Deposit Required (25%)</span>
                        <span className="font-bold">${(pricing.base_cost * 1.25 * 0.25).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-white/70 text-xs uppercase tracking-wider mb-2">Package Includes</p>
                    <p className="text-white/90 text-sm">{pricing.pricing_breakdown.flights}</p>
                    <p className="text-white/90 text-sm">{pricing.pricing_breakdown.hotel}</p>
                    <p className="text-white/90 text-sm">{pricing.pricing_breakdown.transfer}</p>
                    {pricing.pricing_breakdown.companion !== 'Not required' && (
                      <p className="text-white/90 text-sm">{pricing.pricing_breakdown.companion}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}