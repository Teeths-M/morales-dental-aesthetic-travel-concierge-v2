import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WHITELIST = [
  'retryFailedDispatches',
  'autoReassignDoctorOnDecline',
  'checkPartnerSLABreaches',
  'escalateSoloCheckIn',
  'alertStagnantCases',
  'checkStaleLiveLocations',
];

export default function AdminMonitorAction() {
  const [params] = useSearchParams();
  const fn = params.get('fn') || '';
  const desc = params.get('desc') || 'AI Recommended Action';
  const reason = params.get('reason') || '';

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isWhitelisted = WHITELIST.includes(fn);

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke(fn, {});
      setResult(res?.data || res);
      toast.success(`${fn} executed successfully`);
    } catch (err) {
      setError(err.message || 'Execution failed');
      toast.error(`Execution failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!isWhitelisted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold">Action Not Authorized</h1>
          <p className="text-muted-foreground text-sm">
            The function "{fn}" is not on the approved whitelist. Only pre-vetted safety functions can be executed from this page.
          </p>
          <Link to="/admin">
            <Button variant="outline">← Back to Admin</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI Recommended Action</h1>
              <p className="text-xs text-muted-foreground">Morales Safety Monitor</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Insight</p>
              <p className="text-sm font-medium">{desc}</p>
            </div>

            {reason && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AI Reasoning</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Function to Execute</p>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{fn}</code>
            </div>
          </div>

          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="font-semibold text-sm">Execution Complete</p>
              </div>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="font-semibold text-sm">Execution Failed</p>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}

          <Button
            onClick={handleExecute}
            disabled={executing || !!result}
            className="w-full min-h-[44px]"
          >
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : result ? (
              'Action Completed'
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Execute Action
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}