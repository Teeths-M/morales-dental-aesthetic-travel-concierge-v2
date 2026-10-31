import React from 'react';
import { cn } from '@/lib/utils';

/**
 * MSafeText — the three text roles the mobile surfaces actually need, each
 * mapped to a token pair that keeps WCAG AA contrast in both themes.
 *
 * `variant` is written as literal class strings on purpose: Tailwind purges
 * anything it cannot see, so building these names dynamically would silently
 * produce unstyled text.
 */
const VARIANT_CLASS = {
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-msafe-muted',
  title: 'font-display text-[15px] font-semibold leading-snug text-msafe-ink',
  body: 'text-[13px] leading-relaxed text-msafe-muted',
  meta: 'text-[11px] leading-relaxed text-msafe-muted',
};

export default function MSafeText({ as: Tag = 'p', variant = 'body', className, children, ...rest }) {
  return (
    <Tag className={cn(VARIANT_CLASS[variant] || VARIANT_CLASS.body, className)} {...rest}>
      {children}
    </Tag>
  );
}