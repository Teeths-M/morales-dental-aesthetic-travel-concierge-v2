/**
 * FormField
 *
 * Accessible, production-ready form field wrapper.
 * Supports text, email, tel, number, password, textarea, select.
 * Handles error states, helper text, labels, required markers,
 * left/right addons, and character count.
 *
 * Props:
 *   id           {string}        — links label ↔ input for a11y
 *   label        {string?}
 *   type         {string}        — default 'text'
 *   value        {any}
 *   onChange     {(e|value) => void}
 *   placeholder  {string?}
 *   error        {string?}       — shows red error below field
 *   hint         {string?}       — shows grey hint below field
 *   required     {boolean?}
 *   disabled     {boolean?}
 *   readOnly     {boolean?}
 *   prefix       {ReactNode?}    — icon or text before input
 *   suffix       {ReactNode?}    — icon or text after input
 *   maxLength    {number?}       — enables character counter
 *   rows         {number?}       — for textarea (default 3)
 *   options      {Array<{ value, label }>?} — for select type
 *   dark         {boolean?}      — dark bg variant (default true)
 *   className    {string?}
 */

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

const BASE_INPUT = `
  w-full bg-transparent text-sm text-white placeholder:text-white/25
  border rounded-xl px-3.5 py-2.5 outline-none transition-all duration-150
  focus:ring-1 disabled:opacity-40 disabled:cursor-not-allowed
`;

const DARK_INPUT = `
  border-white/[0.10] bg-white/[0.03]
  focus:border-white/[0.25] focus:ring-white/[0.12]
  read-only:border-white/[0.06] read-only:bg-white/[0.02]
`;

const ERROR_INPUT = `border-red-500/50 focus:border-red-400 focus:ring-red-500/20`;

export default function FormField({
  id: externalId,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required,
  disabled,
  readOnly,
  prefix,
  suffix,
  maxLength,
  rows = 3,
  options,
  dark = true,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const fieldId = externalId || autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const inputClasses = `${BASE_INPUT} ${dark ? DARK_INPUT : ''} ${error ? ERROR_INPUT : ''} ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`;

  const sharedProps = {
    id: fieldId,
    value,
    onChange,
    disabled,
    readOnly,
    placeholder,
    required,
    maxLength,
    'aria-describedby': describedBy,
    'aria-invalid': !!error,
    'aria-required': required,
    ...rest,
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={fieldId}
          className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-white/40' : 'text-muted-foreground'}`}
        >
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none flex items-center">
            {prefix}
          </div>
        )}

        {type === 'textarea' ? (
          <textarea
            {...sharedProps}
            rows={rows}
            className={`${inputClasses} resize-none`}
          />
        ) : type === 'select' ? (
          <select
            {...sharedProps}
            className={`${inputClasses} appearance-none pr-9 cursor-pointer`}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}
                className="bg-[#0D1525] text-white">
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...sharedProps}
            type={type}
            className={inputClasses}
          />
        )}

        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none flex items-center">
            {suffix}
          </div>
        )}

        {/* Select chevron */}
        {type === 'select' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-start justify-between gap-2 min-h-[16px]">
        <div>
          {error && (
            <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}
          {!error && hint && (
            <p id={hintId} className="text-[11px] text-white/25">{hint}</p>
          )}
        </div>
        {maxLength && (
          <span className={`text-[10px] flex-shrink-0 tabular-nums ${
            (value?.length || 0) >= maxLength ? 'text-red-400' : 'text-white/20'
          }`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}