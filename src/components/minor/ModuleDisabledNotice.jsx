import { ShieldOff } from 'lucide-react';

/**
 * ModuleDisabledNotice — what every surface in this module shows while its
 * feature flag is off.
 *
 * Deliberately calm and non-alarming: this is not an error, it is a module that
 * has not been switched on. It says so plainly rather than pretending the page
 * is broken, and it never leaks the existence of a case or a child.
 */
export default function ModuleDisabledNotice({ title = 'Not available yet' }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16 bg-background">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
          <ShieldOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Minor reunification is not switched on for this account. If you are expecting it,
          ask the Morales care team to enable it for the trip.
        </p>
      </div>
    </div>
  );
}