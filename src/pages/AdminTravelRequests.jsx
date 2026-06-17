import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, Hotel, Car, Users, Calendar, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';

const STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-200 border-gray-400/30',
  pricing_requested: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
  quote_sent: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  deposit_paid: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  fully_paid: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  confirmed: 'bg-green-500/20 text-green-200 border-green-400/30',
  cancelled: 'bg-red-500/20 text-red-200 border-red-400/30',
};

export default function AdminTravelRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await base44.entities.TravelRequest.list('-created_at', 100);
      setRequests(data);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await base44.entities.TravelRequest.update(id, { package_status: newStatus });
      toast({ title: 'Status Updated', description: `Request ${newStatus.replace('_', ' ')}` });
      loadRequests();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '-0.02em' }}>Travel Requests</h1>
            <p className="text-white/60 mt-1">Manage concierge booking requests and commissions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <p className="text-emerald-200 text-xs">Total Revenue</p>
              <p className="text-emerald-100 font-bold text-lg">
                ${requests.reduce((sum, r) => sum + (r.profit || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#D4AF37 #D4AF37 #D4AF37 transparent' }} />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <Plane className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No travel requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-semibold text-lg">{req.user_name}</h3>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[req.package_status]}`}>
                          {req.package_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white/50 text-sm">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-white/50 text-xs flex items-center gap-1">
                          <Plane className="w-3 h-3" /> Route
                        </p>
                        <p className="text-white">{req.origin_city} → {req.destination_city}</p>
                        <p className="text-white/60 text-xs">{req.destination_country}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Dates
                        </p>
                        <p className="text-white">{req.departure_date}</p>
                        <p className="text-white/60 text-xs">{req.return_date}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" /> Travelers
                        </p>
                        <p className="text-white">{req.travelers_count} travelers</p>
                        <p className="text-white/60 text-xs capitalize">{req.travel_class.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Contact</p>
                        <p className="text-white text-sm">{req.user_email}</p>
                        {req.user_phone && <p className="text-white/60 text-xs">{req.user_phone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-white/50 text-xs">Package Total</p>
                        <p className="text-lg font-bold text-emerald-300">${req.total_package_price?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Deposit</p>
                        <p className="text-white font-semibold">${req.deposit_amount?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Platform Profit</p>
                        <p className="text-white font-semibold">${req.profit?.toLocaleString() || '0'}</p>
                      </div>
                      {req.hotel_required && (
                        <div className="flex items-center gap-2">
                          <Hotel className="w-4 h-4 text-white/50" />
                          <div>
                            <p className="text-white/50 text-xs">Hotel</p>
                            <p className="text-white text-sm">{req.hotel_star_rating}★ {req.hotel_room_type}</p>
                          </div>
                        </div>
                      )}
                      {req.companion_required && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-white/50" />
                          <div>
                            <p className="text-white/50 text-xs">Companion</p>
                            <p className="text-white text-sm">{req.companion_days} days</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {req.package_status === 'pricing_requested' && (
                      <Button onClick={() => updateStatus(req.id, 'quote_sent')} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <CheckCircle className="w-4 h-4 mr-1" /> Send Quote
                      </Button>
                    )}
                    {req.package_status === 'quote_sent' && (
                      <>
                        <Button onClick={() => updateStatus(req.id, 'deposit_paid')} size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <DollarSign className="w-4 h-4 mr-1" /> Deposit Paid
                        </Button>
                        <Button onClick={() => updateStatus(req.id, 'cancelled')} size="sm" variant="destructive">
                          <XCircle className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                    {req.package_status === 'deposit_paid' && (
                      <>
                        <Button onClick={() => updateStatus(req.id, 'fully_paid')} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle className="w-4 h-4 mr-1" /> Fully Paid
                        </Button>
                        <Button onClick={() => updateStatus(req.id, 'confirmed')} size="sm" className="bg-green-600 hover:bg-green-700">
                          <Clock className="w-4 h-4 mr-1" /> Confirm
                        </Button>
                      </>
                    )}
                    {req.package_status === 'fully_paid' && (
                      <Button onClick={() => updateStatus(req.id, 'confirmed')} size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" /> Confirm Booking
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}