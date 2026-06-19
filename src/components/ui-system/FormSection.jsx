/**
 * FormSection
 *
 * Groups related form fields under a labelled fieldset for structure
 * and accessibility. Renders semantic <fieldset>/<legend>.
 *
 * Props:
 *   title       {string}
 *   description {string?}
 *   children    {ReactNode}
 *   dark        {boolean?}  — default true
 *   className   {string?}
 */
import React from 'react';

export default function FormSection({
  title,
  description,
  children,
  dark = true,
  className = '',
}) {
  return (
    <fieldset className={`border-0 p-0 m-0 ${className}`}>
      <legend className="mb-3 p-0">
        <span className={`block text-sm font-semibold ${dark ? 'text-white/85' : 'text-foreground'}`}>
          {title}
        </span>
        {description && (
          <span className={`block mt-0.5 text-xs leading-relaxed ${dark ? 'text-white/35' : 'text-muted-foreground'}`}>
            {description}
          </span>
        )}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}