import React from 'react';
import { cn } from '@/lib/utils';

/**
 * MSafeCard — the shared day/night surface.
 *
 * Reads only the msafe-* tokens (src/index.css), which are redefined per theme,
 * so one component is correct on a white morning screen and on navy at night
 * with no conditional styling at the call site.
 */
export default function MSafeCard({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-msafe-border bg-msafe-surface p-5',
        'shadow-[0_1px_2px_rgba(6,11,22,0.06)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}