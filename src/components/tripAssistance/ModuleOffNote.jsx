import { ShieldOff } from 'lucide-react';

/**
 * ModuleOffNote — what this module shows while its flag is off.
 *
 * The flag fails closed, so this is the normal state until someone turns it on.
 * It says exactly that, and never hints at a trip, a traveller or a request.
 */
export default function ModuleOffNote() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
        <ShieldOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-2xl text-foreground">Trip assistance is not switched on</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This module ships disabled. An administrator enables it in Admin → Flags before any
        script, packet or request can be created.
      </p>
    </div>
  );
}