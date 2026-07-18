import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronDown, X } from 'lucide-react';
import { normalizeCountry, getCitiesForCountry } from '@/lib/countryCity';

// The nationality-adjective map that used to live here ("Venezuelan" →
// "Venezuela") now lives in @/lib/countryCity so every country/city pair on
// the platform resolves names the same way.

export default function CityOriginSelect({ value, onChange, selectedCountry }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const containerRef = useRef(null);

  const countryKey = normalizeCountry(selectedCountry);
  // When the country doesn't resolve, offer NO list rather than every city on
  // the platform. The previous fallback flattened all 29 countries together, so
  // a user whose nationality didn't map saw Cancun, London and Bangkok in one
  // list — the opposite of filtering by country. An empty list here still lets
  // them type their city freely, which is the honest behaviour.
  const citiesForCountry = countryKey ? getCitiesForCountry(countryKey) : [];

  const filtered = search.length > 0
    ? citiesForCountry.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : citiesForCountry.slice(0, 40);

  // Sync external value (e.g. draft load)
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
          <button type="button" onClick={handleClear} className="absolute right-3 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none" />
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