import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isCheckInCode } from '@/lib/checkInCode';

/**
 * The box that asks for the traveler's 4-digit check-in code when they answer a safety check-in (src/lib/checkInCode.js).
 * Returns askCode(reason) — a promise for the 4 digits, or null if they close it — and the dialog to render once.
 * The digits are hidden as they're typed, for someone watching over the traveler's shoulder.
 */
export function useCheckInCodePrompt() {
  const [pending, setPending] = useState(null); // { reason, resolve }
  const [value, setValue] = useState('');

  const askCode = useCallback((reason) => new Promise((resolve) => {
    setValue('');
    setPending({ reason, resolve });
  }), []);

  const finish = (code) => {
    pending?.resolve(code);
    setPending(null);
    setValue('');
  };

  const codeDialog = (
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) finish(null); }}>
      {/* Above the floating check-in alert (z 9990), which may be what opened it. */}
      <DialogContent className="z-[10001] max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter your check-in code</DialogTitle>
          <DialogDescription>
            {pending?.reason === 'INVALID_CODE'
              ? "That code didn't match. Check it and try again."
              : 'Your 4-digit code confirms it is really you.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (isCheckInCode(value)) finish(value); }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="checkin-code-input" className="sr-only">Check-in code</label>
          <input
            id="checkin-code-input"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-center text-2xl tracking-[0.6em] text-slate-900"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => finish(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!isCheckInCode(value)}>Confirm</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { askCode, codeDialog };
}
