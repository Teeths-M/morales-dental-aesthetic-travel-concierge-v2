import React, { useState, useEffect, useMemo } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
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

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* Search Header - Desktop */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search procedures, doctors, or locations..."
                className="pl-10"
                value={filters.procedure}
                onChange={(e) => updateFilter("procedure", e.target.value)}
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={filters.country} onValueChange={(v) => updateFilter("country", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Countries</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.city} onValueChange={(v) => updateFilter("city", v)} disabled={!filters.country}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Cities</SelectItem>
                  {getCityOptions().map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(filters.rating)} onValueChange={(v) => updateFilter("rating", Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(true)}
                className="gap-2"
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
                <Badge variant="secondary" className="gap-1">
                  {PROCEDURES.find(p => p.id === filters.procedure)?.name || filters.procedure}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("procedure", "")} />
                </Badge>
              )}
              {filters.country && (
                <Badge variant="secondary" className="gap-1">
                  {filters.country}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("country", "")} />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="gap-1">
                  {filters.city}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("city", "")} />
                </Badge>
              )}
              {filters.rating !== 4 && (
                <Badge variant="secondary" className="gap-1">
                  {filters.rating}+ Stars
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("rating", 4)} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load doctors. Please try again.</p>
          </div>
        ) : displayedDoctors.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No doctors found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
            <Button onClick={clearAllFilters}>Clear all filters</Button>
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