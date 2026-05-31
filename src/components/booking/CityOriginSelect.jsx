import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown, X } from 'lucide-react';
import cityData from '@/lib/cityData.json';

/**
 * Smart city-of-origin selector.
 * - If a matching country is selected, shows a filtered dropdown of known cities.
 * - Always allows free-text entry so no city is ever blocked.
 */
export default function CityOriginSelect({ value, onChange, selectedCountry }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const containerRef = useRef(null);

  // Map nationality adjectives → cityData country keys
  const nationalityToCountry = {
    'american': 'United States', 'canadian': 'Canada', 'mexican': 'Mexico',
    'venezuelan': 'Venezuela', 'colombian': 'Colombia', 'brazilian': 'Brazil',
    'argentine': 'Argentina', 'spanish': 'Spain', 'british': 'United Kingdom',
    'french': 'France', 'german': 'Germany', 'australian': 'Australia',
    'indian': 'India', 'turkish': 'Turkey', 'thai': 'Thailand',
    'costa rican': 'Costa Rica', 'panamanian': 'Panama', 'dominican': 'Dominican Republic',
    'jamaican': 'Jamaica', 'trinidadian': 'Trinidad and Tobago',
    'south african': 'South Africa', 'emirati': 'United Arab Emirates',
    'singaporean': 'Singapore', 'malaysian': 'Malaysia', 'filipino': 'Philippines',
    'indonesian': 'Indonesia', 'polish': 'Poland', 'hungarian': 'Hungary',
    'czech': 'Czech Republic',
  };

  const normalized = (selectedCountry || '').toLowerCase();
  const countryKey =
    Object.keys(cityData).find(k => k.toLowerCase() === normalized) ||
    (nationalityToCountry[normalized] ? nationalityToCountry[normalized] : null);
  const citiesForCountry = countryKey
    ? cityData[countryKey]
    : Object.values(cityData).flat();

  const filtered = search.length > 0
    ? citiesForCountry.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : citiesForCountry.slice(0, 40);

  // Sync external value changes (e.g. on draft load)
  useEffect(() => {
    if (value !== search) setSearch(value || '');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = city => {
    setSearch(city);
    onChange(city);
    setOpen(false);
  };

  const handleInput = e => {
    const v = e.target.value;
    setSearch(v);
    onChange(v);
    setOpen(true);
  };

  const handleClear = () => {
    setSearch('');
    onChange('');
    setOpen(false);
  };

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center mt-1.5">
        <MapPin className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={countryKey ? `Search ${countryKey} cities…` : 'Type your city…'}
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          citiesForCountry.length > 0 && (
            <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          )
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-border rounded-lg shadow-lg">
          {filtered.map(city => (
            <li
              key={city}
              onMouseDown={() => handleSelect(city)}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/5 transition-colors ${
                city === value ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'
              }`}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}