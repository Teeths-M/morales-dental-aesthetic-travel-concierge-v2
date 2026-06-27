// @ts-nocheck — pre-existing type gaps in custom ui-system components
/**
 * MobileSheet
 *
 * Bottom sheet for mobile-first actions/filters. Thin, accessible
 * wrapper over the shadcn Sheet primitive with a consistent header.
 * On desktop it still works as a bottom sheet â€” keep contents compact.
 *
 * Props:
 *   open       {boolean}
 *   onOpenChange {(open) => void}
 *   title      {string}
 *   description {string?}
 *   children   {ReactNode}
 *   side       {'bottom'|'right'} â€” default 'bottom'
 *   className  {string?}
 */
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export default function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'bottom',
  className = '',
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={`${side === 'bottom' ? 'rounded-t-2xl max-h-[85vh]' : ''} overflow-y-auto ${className}`}
      >
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
