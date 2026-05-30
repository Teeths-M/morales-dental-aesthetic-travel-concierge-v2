import React from "react";
import { Star, MapPin, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DoctorSearchCard({ doctor, onBook, onViewProfile }) {
  const rating = doctor.rating || 5.0;
  const reviewCount = doctor.review_count || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        {/* Doctor Photo */}
        <div 
          className="h-48 w-full bg-muted cursor-pointer overflow-hidden"
          onClick={onViewProfile}
        >
          {doctor.photo_url ? (
            <img
              src={doctor.photo_url}
              alt={doctor.full_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-display text-primary">
                  {doctor.full_name?.charAt(0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2 py-1 rounded-lg shadow-sm">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
            {reviewCount > 0 && (
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            )}
          </div>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-1">
          <h3 
            className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
            onClick={onViewProfile}
          >
            {doctor.full_name}
          </h3>
          {doctor.clinic_name && (
            <p className="text-sm text-muted-foreground">{doctor.clinic_name}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{doctor.clinic_city}, {doctor.clinic_country}</span>
        </div>

        {/* Experience */}
        {doctor.years_experience && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{doctor.years_experience} years experience</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={onViewProfile}
            variant="outline" 
            className="flex-1"
          >
            View Profile
          </Button>
          <Button 
            onClick={onBook}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Book Consultation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}