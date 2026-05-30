import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cityData } from "@/lib/cityData.json";

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

export default function DoctorFilterPanel({ filters, updateFilter, clearAllFilters, onClose }) {
  const getCityOptions = () => {
    if (!filters.country) return [];
    return cityData[filters.country] || [];
  };

  const priceRange = [filters.minPrice || 0, filters.maxPrice || 50000];

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-6 py-4">
          {/* Procedure Type */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Procedure Type</h4>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {PROCEDURES.map(procedure => (
                  <Button
                    key={procedure.id}
                    variant={filters.procedure === procedure.id ? "default" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => updateFilter("procedure", procedure.id)}
                  >
                    {procedure.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Destination */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Destination</h4>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Country</label>
              <select
                className="w-full p-2 border rounded-md text-sm"
                value={filters.country}
                onChange={(e) => {
                  updateFilter("country", e.target.value);
                  updateFilter("city", ""); // Reset city when country changes
                }}
              >
                <option value="">Select Country</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {filters.country && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">City</label>
                <select
                  className="w-full p-2 border rounded-md text-sm"
                  value={filters.city}
                  onChange={(e) => updateFilter("city", e.target.value)}
                  disabled={!filters.country}
                >
                  <option value="">Select City</option>
                  {getCityOptions().map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Separator />

          {/* Price Range */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Price Range (USD)</h4>
            <Slider
              value={priceRange}
              onValueChange={([min, max]) => {
                updateFilter("minPrice", min);
                updateFilter("maxPrice", max);
              }}
              min={0}
              max={50000}
              step={500}
              className="py-4"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>${priceRange[0].toLocaleString()}</span>
              <span>${priceRange[1].toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Doctor Rating */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Minimum Rating</h4>
            <div className="space-y-2">
              {[4, 4.5, 5].map(rating => (
                <Button
                  key={rating}
                  variant={filters.rating === rating ? "default" : "outline"}
                  className="w-full justify-start text-sm"
                  onClick={() => updateFilter("rating", rating)}
                >
                  {rating}+ Stars
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator />

      <div className="flex gap-2 py-4">
        <Button variant="outline" onClick={clearAllFilters} className="flex-1">
          Clear All
        </Button>
        <Button onClick={onClose} className="flex-1">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}