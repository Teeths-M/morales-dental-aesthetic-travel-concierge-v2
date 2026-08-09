import React from 'react';
import { Mic, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// MicPermissionGate — the "Allow microphone?" prompt M-Care shows before
// first use, like Zoom / Google Meet. Two states:
//   blocked=null  → first-time ask: explains M needs the mic, "Allow" triggers
//                   getUserMedia (the browser's real permission prompt fires
//                   inside that user gesture).
//   blocked=<msg> → a prior attempt was denied/unsupported; shows the message
//                   plus concrete enable steps, so the user isn't stuck.
export default function MicPermissionGate({ open, blocked, onAllow, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onCancel())}>
      <DialogContent className="max-w-sm z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Mic className="w-4 h-4 text-primary" />}
            {blocked ? 'Microphone blocked' : 'Allow microphone?'}
          </DialogTitle>
          <DialogDescription>
            {blocked
              ? 'M-Care needs your microphone to turn speech into text.'
              : 'M-Care uses your microphone only while you speak, to convert your words into text. Audio is not stored beyond transcription.'}
          </DialogDescription>
        </DialogHeader>

        {blocked ? (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">{blocked}</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Tap the camera icon in the browser address bar.</li>
              <li>Set Microphone to <span className="font-medium">Allow</span>.</li>
              <li>Refresh the page, then tap the mic again.</li>
            </ul>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>Your browser will show its own permission prompt when you tap Allow. Choose <span className="font-medium text-foreground">Allow</span> to start speaking.</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onAllow} className="gap-1.5">
            {blocked ? 'Try again' : 'Allow'} <Mic className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}