import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// LocationPermissionGate — the proactive "Allow location access?" prompt
// shown the moment M-Care opens (see MCareOrb.jsx), before any location
// question has ever been asked — a sibling of MicPermissionGate.jsx's
// already-established explain-then-request pattern, applied to GPS instead
// of the microphone. "Allow" calls the real requestGPS() from inside the
// tap, so the browser's own native permission prompt fires within a
// genuine user gesture, never silently in the background.
export default function LocationPermissionGate({ open, onAllow, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onCancel())}>
      <DialogContent className="max-w-sm z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Allow location access?
          </DialogTitle>
          <DialogDescription>
            For your safety, M-Care works best with your exact location — it's how I find what's actually nearest to you and can help fastest in an emergency.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>Your browser will show its own permission prompt when you tap Allow. Choose <span className="font-medium text-foreground">Allow</span> so I always know where you are.</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>Not now</Button>
          <Button onClick={onAllow} className="gap-1.5">
            Allow <MapPin className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
