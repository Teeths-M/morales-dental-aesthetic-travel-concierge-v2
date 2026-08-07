import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Brain, Search, Trash2, Loader2, AlertCircle, CheckCircle2, Flag } from 'lucide-react';

const DARK = '#060B16';
const GOLD = '#D4AF37';

export default function AdminMcareKnowledge() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.McareKnowledge.list('-created_date', 200);
      setRecords(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load brain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      (r.question || '').toLowerCase().includes(q) ||
      (r.answer || '').toLowerCase().includes(q) ||
      (r.search_keywords || []).some((k) => k.toLowerCase().includes(q))
    );
  }, [records, query]);

  const remove = async (id) => {
    if (!confirm('Delete this learned answer from M-Care\'s brain?')) return;
    try {
      await base44.entities.McareKnowledge.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const toggleFlag = async (rec) => {
    try {
      await base44.entities.McareKnowledge.update(rec.id, { flagged_for_review: !rec.flagged_for_review });
      setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, flagged_for_review: !r.flagged_for_review } : r));
    } catch (e) {
      setError(e?.message || 'Failed to update');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: DARK }}>
            <Brain className="h-6 w-6" style={{ color: GOLD }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">M-Care Knowledge Brain</h1>
            <p className="text-sm text-muted-foreground">
              Every answer M-Care researched to ≥80% confidence and memorized for reuse. Flag inaccurate entries so recall skips them until fixed.
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions, answers, or keywords…"
                className="flex-1"
              />
              <Button variant="outline" onClick={load}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {records.length === 0 ? 'M-Care hasn\'t memorized any answers yet — it learns when a question stumps it.' : 'No matches for your search.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.id} className={r.flagged_for_review ? 'opacity-60' : ''}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{r.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.answer}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${r.confidence_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          <CheckCircle2 className="h-3 w-3" /> {r.confidence_score}% confidence
                        </span>
                        {r.journey_context && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{r.journey_context}</span>}
                        <span className="text-muted-foreground">Recalled {r.recalled_count || 0}×</span>
                        {r.flagged_for_review && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"><Flag className="h-3 w-3" /> Flagged</span>}
                        {r.created_by && <span className="text-muted-foreground">· by {r.created_by}</span>}
                      </div>
                      {r.search_keywords?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.search_keywords.slice(0, 8).map((k, i) => (
                            <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleFlag(r)} className="gap-1.5">
                        <Flag className="h-3.5 w-3.5" /> {r.flagged_for_review ? 'Unflag' : 'Flag'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(r.id)} className="gap-1.5 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}