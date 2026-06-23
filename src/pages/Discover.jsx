import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, ChevronDown, Star, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import DoctorSearchCard from "@/components/discover/DoctorSearchCard";
import DoctorFilterPanel from "@/components/discover/DoctorFilterPanel";
import cityData from "@/lib/cityData.json";

const PROCEDURES = [
  { id: "dental_implants", name: "Dental Implants", category: "Dental" },
  { id: "all_on_4", name: "All on 4", category: "Dental" },
  { id: "porcelain_veneers", name: "Porcelain Veneers", category: "Dental" },
  { id: "smile_makeover", name: "Smile Makeover", category: "Dental" },
  { id: "teeth_whitening", name: "Teeth Whitening", category: "Dental" },
  { id: "rhinoplasty", name: "Rhinoplasty", category: "Aesthetic" },
  { id: "breast_surgery", name: "Breast Surgery", category: "Aesthetic" },
  { id: "liposuction", name: "Liposuction", category: "Aesthetic" },
  { id: "tummy_tuck", name: "Tummy Tuck", category: "Aesthetic" },
  { id: "facelift", name: "Facelift", category: "Aesthetic" },
  { id: "gastric_sleeve", name: "Gastric Sleeve", category: "Bariatric" },
  { id: "gastric_bypass", name: "Gastric Bypass", category: "Bariatric" },
  { id: "joint_replacement", name: "Joint Replacement", category: "Orthopedics" },
  { id: "spine_surgery", name: "Spine Surgery", category: "Orthopedics" },
];

const COUNTRIES = Object.keys(cityData).sort();

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  // Get filters from URL params
  const filters = useMemo(() => ({
    procedure: searchParams.get("procedure") || "",
    country: searchParams.get("country") || "",
    city: searchParams.get("city") || "",
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    rating: searchParams.get("rating") ? Number(searchParams.get("rating")) : 4,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 12,
  }), [searchParams]);

  // Fetch doctors with specialties
  const { data: doctors, isLoading, error } = useQuery({
    queryKey: ["doctors-search", filters],
    queryFn: async () => {
      const allDoctors = await base44.entities.Doctor.filter({ status: "active" });
      const allSpecialties = await base44.entities.DoctorSpecialty.list();
      
      // Filter doctors based on criteria
      let filtered = allDoctors.filter(doctor => {
        // Country filter
        if (filters.country && doctor.clinic_country !== filters.country) return false;
        // City filter
        if (filters.city && doctor.clinic_city !== filters.city) return false;
        // Rating filter
        if (filters.rating && doctor.rating < filters.rating) return false;
        
        // Procedure filter - check if doctor has this specialty
        if (filters.procedure) {
          const hasSpecialty = allSpecialties.some(
            spec => spec.doctor_id === doctor.id && 
            (spec.procedure_id === filters.procedure || spec.procedure_name.toLowerCase().includes(filters.procedure.toLowerCase()))
          );
          if (!hasSpecialty) return false;
        }
        
        return true;
      });

      // Price filtering would require joining with ProcedurePricing - simplified for now
      // In production, create a backend function for efficient filtering
      
      return filtered;
    },
  });

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "" || value === undefined || value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    // Reset page to 1 when filters change
    if (key !== "page") {
      newParams.set("page", "1");
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const loadMore = () => {
    updateFilter("page", filters.page + 1);
  };

  const getCityOptions = () => {
    if (!filters.country) return [];
    return cityData[filters.country] || [];
  };

  const displayedDoctors = doctors?.slice(0, filters.page * filters.limit) || [];
  const hasMore = doctors && displayedDoctors.length < doctors.length;

  return (
    <div className="min-h-screen bg-[#060B16]" style={{ background: 'linear-gradient(180deg, #060B16 0%, #0A101D 100%)' }}>
      {/* Search Header - Desktop */}
      <div className="sticky top-[72px] z-40 bg-[#060B16]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-4 mb-4">
            {/* Discover Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display text-white" style={{ letterSpacing: '-0.02em' }}>Discover</h1>
              <div className="w-8 h-[2px]" style={{ background: '#D4AF37' }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search procedures, doctors, or locations..."
                className="pl-11 bg-[#0C1A1D] border-[#2A3F4A] text-white placeholder:text-white/40 focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20"
                value={filters.procedure}
                onChange={(e) => updateFilter("procedure", e.target.value)}
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={filters.country} onValueChange={(v) => updateFilter("country", v)}>
                <SelectTrigger className="w-40 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:border-[#D4AF37]/50 hover:bg-[#0E2A2A]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C1A1D] border-[#2A3F4A] text-white">
                  <SelectItem value="" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">All Countries</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country} className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.city} onValueChange={(v) => updateFilter("city", v)} disabled={!filters.country}>
                <SelectTrigger className="w-40 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:border-[#D4AF37]/50 hover:bg-[#0E2A2A] disabled:opacity-40 disabled:border-white/[0.08]">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C1A1D] border-[#2A3F4A] text-white">
                  <SelectItem value="" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">All Cities</SelectItem>
                  {getCityOptions().map(city => (
                    <SelectItem key={city} value={city} className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(filters.rating)} onValueChange={(v) => updateFilter("rating", Number(v))}>
                <SelectTrigger className="w-32 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:border-[#D4AF37]/50 hover:bg-[#0E2A2A]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C1A1D] border-[#2A3F4A] text-white">
                  <SelectItem value="4" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">4+ Stars</SelectItem>
                  <SelectItem value="4.5" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">4.5+ Stars</SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">5 Stars</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(true)}
                className="gap-2 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:bg-[#0E2A2A] hover:border-[#D4AF37]/50 hover:text-white"
              >
                <Filter className="h-4 w-4" />
                More Filters
              </Button>
            </div>

            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters */}
          {(filters.procedure || filters.country || filters.city || filters.rating !== 4) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {filters.procedure && (
                <Badge variant="secondary" className="gap-1 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:bg-[#0E2A2A]">
                  {PROCEDURES.find(p => p.id === filters.procedure)?.name || filters.procedure}
                  <X className="h-3 w-3 text-white/70 hover:text-white cursor-pointer" onClick={() => updateFilter("procedure", "")} />
                </Badge>
              )}
              {filters.country && (
                <Badge variant="secondary" className="gap-1 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:bg-[#0E2A2A]">
                  {filters.country}
                  <X className="h-3 w-3 text-white/70 hover:text-white cursor-pointer" onClick={() => updateFilter("country", "")} />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="gap-1 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:bg-[#0E2A2A]">
                  {filters.city}
                  <X className="h-3 w-3 text-white/70 hover:text-white cursor-pointer" onClick={() => updateFilter("city", "")} />
                </Badge>
              )}
              {filters.rating !== 4 && (
                <Badge variant="secondary" className="gap-1 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:bg-[#0E2A2A]">
                  {filters.rating}+ Stars
                  <X className="h-3 w-3 text-white/70 hover:text-white cursor-pointer" onClick={() => updateFilter("rating", 4)} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-white/80 hover:text-white hover:bg-white/[0.08]">
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="container mx-auto px-6 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-[#0A101D]/40 border-white/[0.06]">
                <CardContent className="p-6">
                  <div className="h-48 bg-white/[0.04] rounded-xl mb-4" />
                  <div className="h-5 bg-white/[0.06] rounded w-3/4 mb-3" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-white/[0.04] rounded w-16" />
                    <div className="h-3 bg-white/[0.04] rounded w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-[15px]">Failed to load doctors. Please try again.</p>
          </div>
        ) : displayedDoctors.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-3 text-white" style={{ letterSpacing: '-0.01em' }}>No doctors found</h3>
            <p className="text-white/40 mb-6 text-[15px]">Try adjusting your filters</p>
            <Button onClick={clearAllFilters} className="bg-[#D4AF37] hover:bg-[#E8C85C] text-[#0C1A1D] font-semibold">Clear all filters</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedDoctors.map(doctor => (
                <DoctorSearchCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={() => navigate(`/booking?doctor_id=${doctor.id}&procedure=${filters.procedure}&source=search`)}
                  onViewProfile={() => navigate(`/providers/${doctor.id}`)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button onClick={loadMore} variant="outline" size="lg">
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters Sheet (Mobile & Desktop Advanced) */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <DoctorFilterPanel
            filters={filters}
            updateFilter={updateFilter}
            clearAllFilters={clearAllFilters}
            onClose={() => setShowFilters(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}