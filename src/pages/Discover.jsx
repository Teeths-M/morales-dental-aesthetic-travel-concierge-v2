// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X } from "lucide-react";
import { fuzzyScore } from "@/lib/fuzzyMatch";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DoctorSearchCard from "@/components/discover/DoctorSearchCard";
import DoctorFilterPanel from "@/components/discover/DoctorFilterPanel";
import PageHeroBand from "@/components/layout/PageHeroBand";
import cityData from "@/lib/cityData.json";
import { SERVED_COUNTRIES } from "@/lib/countryCity";
import { isDoctorVerified } from "@/components/doctor/DoctorVerifiedBadge";

// id = keyword matched against DoctorSpecialty.procedure_name (case-insensitive includes)
// Must align with en_name values in MasterProcedure entity (see seedMasterProcedures)
const PROCEDURES = [
  { id: "implant", name: "Dental Implants", category: "Dental" },
  { id: "All-on-4", name: "All-on-4 Implants", category: "Dental" },
  { id: "Porcelain Veneers", name: "Porcelain Veneers", category: "Dental" },
  { id: "Smile Makeover", name: "Smile Makeover", category: "Dental" },
  { id: "Teeth Whitening", name: "Teeth Whitening", category: "Dental" },
  { id: "Rhinoplasty", name: "Rhinoplasty", category: "Aesthetic" },
  { id: "Breast", name: "Breast Surgery", category: "Aesthetic" },
  { id: "Liposuction", name: "Liposuction", category: "Aesthetic" },
  { id: "Tummy Tuck", name: "Tummy Tuck", category: "Aesthetic" },
  { id: "Facelift", name: "Facelift", category: "Aesthetic" },
  { id: "Gastric Sleeve", name: "Gastric Sleeve", category: "Bariatric" },
  { id: "Gastric Bypass", name: "Gastric Bypass", category: "Bariatric" },
  { id: "Replacement", name: "Joint Replacement", category: "Orthopedics" },
  { id: "Spinal", name: "Spine Surgery", category: "Orthopedics" },
];

const COUNTRIES = [...SERVED_COUNTRIES].sort();

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(() => searchParams.get("procedure") || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Keep local text in sync when external actions clear the filter (e.g. "Clear all")
  useEffect(() => { setSearchText(filters.procedure); }, [filters.procedure]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Raw data: fetched ONCE and cached for 10 minutes.
  // Specialty rows are indexed by doctorId so filtering is O(1) per doctor.
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["discover-raw"],
    queryFn: async () => {
      const [allDoctors, allSpecialties] = await Promise.all([
        base44.entities.Doctor.filter({ status: "active" }),
        base44.entities.DoctorSpecialty.list('-created_date', 2000),
      ]);
      const specialtyByDoctor = new Map();
      for (const spec of allSpecialties) {
        if (!specialtyByDoctor.has(spec.doctor_id)) specialtyByDoctor.set(spec.doctor_id, []);
        specialtyByDoctor.get(spec.doctor_id).push(spec);
      }
      /* This page's subtitle reads "Browse verified specialists". It was
         filtering on status: "active" only — active is not verified, so an
         unverified doctor appeared under a verification claim. Same defect
         fixed on /providers; this second listing was missed on the first pass.

         Gated on the shared isDoctorVerified so the two directories and the
         per-doctor badge can never disagree about who counts as verified. */
      return { doctors: allDoctors.filter(isDoctorVerified), specialtyByDoctor };
    },
    staleTime: 10 * 60 * 1000,
  });

  // Autocomplete suggestions from the known PROCEDURES list
  const procedureSuggestions = useMemo(() => {
    const q = searchText.trim();
    if (q.length < 2) return [];
    return PROCEDURES
      .map(p => ({ ...p, score: Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.id)) }))
      .filter(p => p.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [searchText]);

  // Filtering is pure in-memory computation — filter changes never trigger network requests.
  // Uses fuzzy matching so typos still surface results.
  const filteredDoctors = useMemo(() => {
    if (!rawData) return [];
    const { doctors, specialtyByDoctor } = rawData;
    const keyword = filters.procedure.toLowerCase();
    return doctors.filter(doctor => {
      if (filters.country && doctor.clinic_country !== filters.country) return false;
      if (filters.city && doctor.clinic_city !== filters.city) return false;
      if (filters.rating && doctor.rating != null && doctor.rating < filters.rating) return false;
      if (keyword) {
        const specs = specialtyByDoctor.get(doctor.id) || [];
        if (!specs.some(spec => fuzzyScore(keyword, spec.procedure_name) >= 55)) return false;
      }
      return true;
    });
  }, [rawData, filters.procedure, filters.country, filters.city, filters.rating]);

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === "" || value === undefined || value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
      if (key !== "page") newParams.set("page", "1");
      return newParams;
    });
  };

  // Debounce text search — 400ms delay prevents URL thrashing on every keystroke
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFilter("procedure", val), 400);
  };

  const applySuggestion = (proc) => {
    setSearchText(proc.name);
    setShowSuggestions(false);
    clearTimeout(debounceRef.current);
    updateFilter("procedure", proc.name);
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

  const displayedDoctors = filteredDoctors.slice(0, filters.page * filters.limit);
  const hasMore = displayedDoctors.length < filteredDoctors.length;

  return (
    <div className="min-h-screen bg-[#060B16]" style={{ background: 'linear-gradient(180deg, #060B16 0%, #0A101D 100%)' }}>
      <PageHeroBand
        eyebrow="Find Your Specialist"
        title="Discover"
        subtitle="Browse verified specialists across 10 destinations. Filter by procedure, location, and rating."
      />
      {/* Search Header */}
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
            {/* Smart Search Bar with autocomplete */}
            <div ref={searchInputRef} className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 z-10 pointer-events-none" />
              <Input
                placeholder="Type a procedure, doctor, or location…"
                className="pl-11 bg-[#0C1A1D] border-[#2A3F4A] text-white placeholder:text-white/40 focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20"
                value={searchText}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
              />
              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {showSuggestions && procedureSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.13 }}
                    className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden border border-[#2A3F4A] shadow-2xl"
                    style={{ background: '#0C1A1D' }}
                  >
                    {procedureSuggestions.map((p, i) => (
                      <button
                        key={p.id}
                        onMouseDown={() => applySuggestion(p)}
                        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors text-left"
                        style={{ borderBottom: i < procedureSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                      >
                        <span className="text-sm text-white font-medium">{p.name}</span>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                          {p.category}
                        </span>
                      </button>
                    ))}
                    <div className="px-4 py-2 border-t border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[10px] text-white/25">M finds results even with typos — just keep typing.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={filters.country || "all"} onValueChange={(v) => updateFilter("country", v === "all" ? "" : v)}>
                <SelectTrigger className="w-40 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:border-[#D4AF37]/50 hover:bg-[#0E2A2A]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C1A1D] border-[#2A3F4A] text-white">
                  <SelectItem value="all" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">All Countries</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country} className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.city || "all"} onValueChange={(v) => updateFilter("city", v === "all" ? "" : v)} disabled={!filters.country}>
                <SelectTrigger className="w-40 bg-[#0C1A1D] border-[#2A3F4A] text-white hover:border-[#D4AF37]/50 hover:bg-[#0E2A2A] disabled:opacity-40 disabled:border-white/[0.08]">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent className="bg-[#0C1A1D] border-[#2A3F4A] text-white">
                  <SelectItem value="all" className="text-white hover:bg-[#D4AF37]/10 hover:text-white focus:bg-[#D4AF37]/10 focus:text-white">All Cities</SelectItem>
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
                  {PROCEDURES.find(p => p.id === filters.procedure)?.name || filters.procedure.charAt(0).toUpperCase() + filters.procedure.slice(1)}
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
            <h3 className="text-xl font-semibold mb-3 text-white" style={{ letterSpacing: '-0.01em' }}>No match yet</h3>
            <p className="text-white/40 mb-6 text-[15px]">Try a broader search — or let us connect you with the right specialist directly.</p>
            <Button onClick={clearAllFilters} className="bg-[#D4AF37] hover:bg-[#E8C85C] text-[#0C1A1D] font-semibold">Clear filters</Button>
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
        <SheetContent className="w-full sm:max-w-md bg-[#0C1A1D] border-[#2A3F4A] text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Filters</SheetTitle>
            <SheetDescription className="sr-only">Filter doctors by procedure, destination, and rating</SheetDescription>
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