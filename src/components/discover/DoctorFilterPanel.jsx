import React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import cityData from "@/lib/cityData.json";
import { SERVED_COUNTRIES } from "@/lib/countryCity";

// id = keyword matched against DoctorSpecialty.procedure_name (case-insensitive includes)
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

export default function DoctorFilterPanel({ filters, updateFilter, clearAllFilters, onClose }) {
  const getCityOptions = () => {
    if (!filters.country) return [];
    return cityData[filters.country] || [];
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-6 py-4">
          {/* Procedure Type */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-white">Procedure Type</h4>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {PROCEDURES.map(procedure => (
                  <button
                    key={procedure.id}
                    onClick={() => updateFilter("procedure", filters.procedure === procedure.id ? "" : procedure.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filters.procedure === procedure.id
                        ? "bg-[#D4AF37] text-[#0C1A1D] font-semibold"
                        : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {procedure.name}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator className="bg-white/[0.08]" />

          {/* Destination */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white">Destination</h4>

            <div className="space-y-2">
              <label className="text-xs text-white/50">Country</label>
              <select
                className="w-full p-2.5 bg-[#0A101D] border border-[#2A3F4A] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]/60"
                value={filters.country}
                onChange={(e) => {
                  updateFilter("country", e.target.value);
                  updateFilter("city", "");
                }}
              >
                <option value="">All Countries</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {filters.country && (
              <div className="space-y-2">
                <label className="text-xs text-white/50">City</label>
                <select
                  className="w-full p-2.5 bg-[#0A101D] border border-[#2A3F4A] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]/60"
                  value={filters.city}
                  onChange={(e) => updateFilter("city", e.target.value)}
                >
                  <option value="">All Cities</option>
                  {getCityOptions().map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Separator className="bg-white/[0.08]" />

          {/* Doctor Rating */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-white">Minimum Rating</h4>
            <div className="space-y-2">
              {[4, 4.5, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => updateFilter("rating", rating)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    filters.rating === rating
                      ? "bg-[#D4AF37] text-[#0C1A1D] font-semibold"
                      : "border border-[#2A3F4A] text-white/70 hover:border-[#D4AF37]/50 hover:text-white"
                  }`}
                >
                  {rating}+ Stars
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-white/[0.08]" />

      <div className="flex gap-2 py-4">
        <button
          onClick={clearAllFilters}
          className="flex-1 px-4 py-2.5 rounded-lg border border-[#2A3F4A] text-white/70 hover:text-white hover:border-white/30 text-sm font-medium transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E8C85C] text-[#0C1A1D] text-sm font-semibold transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}