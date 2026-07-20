import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

export default function AdminAuditChain() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runVerification = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('verifyAuditChain', {});
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Could not run verification — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white">Audit Chain Integrity</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Verifies that no audit log entries have been tampered with or deleted.
            </p>
          </div>
          <Button onClick={runVerification} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verifying…' : 'Run Verification'}
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {/* Summary Card */}
            <Card className={result.chain_intact ? 'border-green-500' : 'border-destructive'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  {result.chain_intact
                    ? <ShieldCheck className="w-6 h-6 text-green-600" />
                    : <ShieldAlert className="w-6 h-6 text-destructive" />}
                  {result.status === 'empty'
                    ? 'No Entries'
                    : result.chain_intact
                    ? 'Chain Intact — No Tampering Detected'
                    : 'Chain Broken — Tampering Detected'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Entries</p>
                  <p className="text-xl font-semibold">{result.total_entries}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Broken Links</p>
                  <p className={`text-xl font-semibold ${result.broken_count > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {result.broken_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Verified At</p>
                  <p className="text-sm font-medium">{new Date(result.verified_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Broken Entries Detail */}
            {result.broken_entries && result.broken_entries.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Broken Chain Links ({result.broken_entries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.broken_entries.map((entry, idx) => (
                    <div key={idx} className="bg-destructive/10 rounded-lg p-4 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-destructive">Entry #{entry.index + 1}</span>
                        <Badge variant="destructive">{entry.event_type || 'unknown'}</Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <p><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{entry.id}</span></p>
                        <p><span className="text-muted-foreground">Timestamp:</span> {new Date(entry.timestamp).toLocaleString()}</p>
                        <p><span className="text-muted-foreground">Issue:</span> {entry.issue}</p>
                        <p><span className="text-muted-foreground">Expected hash:</span> <span className="font-mono text-xs break-all">{entry.expected}</span></p>
                        <p><span className="text-muted-foreground">Found hash:</span> <span className="font-mono text-xs break-all">{entry.found}</span></p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.chain_intact && result.total_entries > 0 && (
              <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CardContent className="pt-6 flex items-center gap-3 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>All {result.total_entries} audit log entries verified. The chain is unbroken from genesis.</span>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!result && !loading && !error && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-16">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Click "Run Verification" to check the integrity of the audit log chain.</p>
              <p className="text-xs mt-2">This verifies that no entries have been deleted or modified since creation.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}