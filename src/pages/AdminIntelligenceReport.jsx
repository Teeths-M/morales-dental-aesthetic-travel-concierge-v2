import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-2xl font-bold" style={{ color: DARK }}>{value}</span>
      <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export default function AdminIntelligenceReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [summary, setSummary] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPdfUrl(null);
    setSummary(null);
    try {
      const res = await base44.functions.invoke('generateIntelligenceReport', {});
      const data = res?.data || res;
      if (!data || data.error) throw new Error(data?.error || 'Failed to generate report');
      setPdfUrl(data.pdf_url);
      setSummary(data.summary || null);
    } catch (e) {
      setError(e?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: DARK }}>
            <ShieldCheck className="h-6 w-6" style={{ color: GOLD }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">M-Care Intelligence Report</h1>
            <p className="text-sm text-muted-foreground">
              Auto-generated PDF summary of every partner's verification status, risk score, and monitoring history — for legal &amp; compliance teams.
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Compiles the current verification state and risk scores across all five partner types (doctors, travel agencies, taxi/transport, security, companions) plus platform-wide monitoring activity. The PDF is generated on demand and opens in a preview you can download.
            </p>
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Generate Intelligence Report'}
            </Button>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Doctors" value={summary.partners?.doctors ?? 0} />
            <Stat label="Travel Agencies" value={summary.partners?.travel_agencies ?? 0} />
            <Stat label="Transport" value={summary.partners?.taxis ?? 0} />
            <Stat label="Security" value={summary.partners?.security ?? 0} />
            <Stat label="Companions" value={summary.partners?.companions ?? 0} />
            <Stat label="Check-ins" value={summary.check_ins?.total ?? 0} />
          </div>
        )}

        {pdfUrl && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">Report Preview</CardTitle>
                <a href={pdfUrl} download={`mcare-intelligence-report-${new Date().toISOString().slice(0, 10)}.pdf`}>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <iframe
                src={pdfUrl}
                title="M-Care Intelligence Report"
                className="h-[70vh] w-full rounded-lg border border-border"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}