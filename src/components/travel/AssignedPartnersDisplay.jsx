import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Car, Star, Mail, Phone, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AssignedPartnersDisplay({ travelRequest }) {
  if (!travelRequest?.travel_agency_id) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse text-white/60">
            <Plane className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Matching you with the best travel partners...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const agency = travelRequest.travel_agency;
  const taxi = travelRequest.chauffeur;

  return (
    <div className="space-y-4">
      {/* Travel Agency */}
      {agency && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                    <Plane className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-white" style={{ letterSpacing: '-0.02em' }}>
                      {agency.name}
                    </h3>
                    <p className="text-xs text-emerald-300/80">Your Travel Concierge</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-semibold text-white">{agency.rating?.toFixed(1) || '5.0'}</span>
                <span className="text-xs text-white/50">• Premium Partner</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>{agency.email}</span>
                </div>
                {agency.phone && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>{agency.phone}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-white/60 mt-4 leading-relaxed">
                This verified partner will handle your flights, hotel, and ground transportation. 
                They'll contact you within 24 hours with a customized quote.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Taxi Service */}
      {taxi && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-white" style={{ letterSpacing: '-0.02em' }}>
                      {taxi.name}
                    </h3>
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
                <span className="text-sm font-semibold text-white">{taxi.quality_score?.toFixed(1) || '5.0'}</span>
                <span className="text-xs text-white/50">Quality Score</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>{taxi.email}</span>
                </div>
                {taxi.phone && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Phone className="w-4 h-4 text-blue-400" />
                    <span>{taxi.phone}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-white/60 mt-4 leading-relaxed">
                Your chauffeur service for airport transfers and local transportation during your stay.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}