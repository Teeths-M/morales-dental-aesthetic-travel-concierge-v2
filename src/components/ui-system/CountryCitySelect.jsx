import React from 'react';
import SearchSelect from './SearchSelect';
import {
  ALL_COUNTRY_OPTIONS,
  SERVED_COUNTRY_OPTIONS,
  getCitiesForCountry,
  hasCityList,
  cityAfterCountryChange,
  CITY_PLACEHOLDER,
} from '@/lib/countryCity';

/**
 * CountryCitySelect — the one country/city pair used across the platform.
 *
 * Picking a country filters the city list to that country, and changing the
 * country drops a city that no longer belongs to it. Before this existed each
 * page wired that up itself (or didn't), so the behaviour drifted: some pages
 * filtered, some offered every city regardless of country, some were plain
 * text boxes.
 *
 * The city field deliberately has three states rather than two:
 *   1. no country yet      → disabled, "Please select a country first"
 *   2. country we cover    → searchable list of that country's cities
 *   3. country we don't    → still typable, "Enter your city"
 *
 * State 3 is the important one. We hold cities for 29 markets but offer all
 * 195 countries, so a hard "no cities available" would strand a patient from
 * any of the other 166 with no way to enter where they live. The city list is
 * an accelerator, never a gate — which is also why the city picker is not
 * `strict`: a real city missing from our list must still be enterable.
 *
 * @param {object}   props
 * @param {string}   props.country            selected country
 * @param {string}   props.city               selected city
 * @param {Function} props.onChange           ({ country, city }) => void — always both
 * @param {boolean}  [props.servedOnly]       limit countries to markets we cover
 * @param {boolean}  [props.dark]             dark surfaces
 * @param {boolean}  [props.boxed]            render each field's own border
 * @param {string}   [props.countryLabel]
 * @param {string}   [props.cityLabel]
 * @param {string}   [props.countryPlaceholder]
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.testIdPrefix]     e.g. "doctor" → doctor-country / doctor-city
 * @param {string}   [props.className]
 */
export default function CountryCitySelect({
  country = '',
  city = '',
  onChange,
  servedOnly = false,
  dark = false,
  boxed = true,
  countryLabel = 'Country',
  cityLabel = 'City',
  countryPlaceholder = 'Select a country',
  disabled = false,
  testIdPrefix,
  className = '',
}) {
  const countryOptions = servedOnly ? SERVED_COUNTRY_OPTIONS : ALL_COUNTRY_OPTIONS;
  const cities = getCitiesForCountry(country);
  const covered = hasCityList(country);

  // Changing country must never leave a city from the previous country behind.
  const handleCountry = (nextCountry) => {
    onChange({ country: nextCountry, city: cityAfterCountryChange(nextCountry, city) });
  };
  const handleCity = (nextCity) => onChange({ country, city: nextCity });

  const cityPlaceholder = !country
    ? CITY_PLACEHOLDER.noCountry
    : covered
      ? CITY_PLACEHOLDER.picker
      : CITY_PLACEHOLDER.freeText;

  const labelCls = dark
    ? 'block text-xs font-semibold mb-2 text-white/70'
    : 'block text-xs font-semibold mb-2 text-slate-600';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div data-testid={testIdPrefix ? `${testIdPrefix}-country-field` : undefined}>
        <label className={labelCls}>{countryLabel}</label>
        <SearchSelect
          value={country}
          onChange={handleCountry}
          options={countryOptions}
          placeholder={countryPlaceholder}
          disabled={disabled}
          dark={dark}
          boxed={boxed}
          testId={testIdPrefix ? `${testIdPrefix}-country` : undefined}
          strict
        />
      </div>

      <div data-testid={testIdPrefix ? `${testIdPrefix}-city-field` : undefined}>
        <label className={labelCls}>{cityLabel}</label>
        <SearchSelect
          value={city}
          onChange={handleCity}
          options={cities}
          placeholder={cityPlaceholder}
          disabled={disabled || !country}
          dark={dark}
          boxed={boxed}
          testId={testIdPrefix ? `${testIdPrefix}-city` : undefined}
        />
        {country && !covered && (
          <p className={`mt-1.5 text-[11px] ${dark ? 'text-white/40' : 'text-slate-400'}`}>
            We don&apos;t have a city list for {country} yet — type your city and we&apos;ll take it from there.
          </p>
        )}
      </div>
    </div>
  );
}
