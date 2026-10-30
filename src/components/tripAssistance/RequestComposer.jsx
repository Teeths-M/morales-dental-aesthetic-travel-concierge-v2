import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScriptReview from './ScriptReview';
import { modesForCategory, TIER_META } from '@/lib/tripAssistance';

const MODE_LABEL = {
  written: 'Send it as a written request',
  human_call: 'Ask M-Care to call for me',
};

/**
 * RequestComposer — category form, then the approval screen.
 *
 * The sentence is composed by the server from the closed template, never typed
 * here. This screen collects the few approved inputs, asks the server what the
 * script would actually say, and shows that back verbatim before anything is
 * approved.
 */
export default function RequestComposer({ category, onPreview, onApprove, onClose }) {
  const [values, setValues] = useState({});
  const [modes] = useState(() => modesForCategory(category));
  const [mode, setMode] = useState(() => modesForCategory(category)[0]);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [script, setScript] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const meta = TIER_META[category.tier];
  const missing = (category.fields || []).some((f) => f.required && !String(values[f.key] || '').trim());

  const upload = async (file) => {
    setError('');
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setAttachment({ file_uri: res.file_uri, name: file.name });
    } catch (e) {
      setError(e?.message || 'Could not attach that file.');
    } finally {
      setUploading(false);
    }
  };

  const preview = async () => {
    setError('');
    setBusy(true);
    try {
      const next = await onPreview({ category_key: category.key, mode, values, attachment });
      setScript(next);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not prepare the script.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setError('');
    setBusy(true);
    try {
      await onApprove(script);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not send that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={script ? () => setScript(null) : onClose}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {script ? 'Back' : 'All requests'}
        </button>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Tier {category.tier} · {meta.short}
        </span>
      </div>

      <div className="p-4">
        {script ? (
          <ScriptReview
            script={script}
            onApprove={approve}
            onBack={() => setScript(null)}
            busy={busy}
            error={error}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl leading-tight text-foreground">{category.label}</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{meta.note}</p>
            </div>

            {modes.length > 1 && (
              <div className="space-y-1.5">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                      mode === m
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            )}

            {modes.length === 1 && (
              <p className="rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground">
                {mode === 'written'
                  ? 'This one is written only. A named care-team member reads it, and nothing is said aloud.'
                  : 'This one goes to a human straight away. No script is spoken for you.'}
              </p>
            )}

            {(category.fields || []).map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {field.label}
                  {field.required ? '' : ' (optional)'}
                </span>
                <input
                  value={values[field.key] || ''}
                  maxLength={field.maxLength}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-[#D4AF37]"
                />
                <span className="mt-1 block text-right text-[10.5px] text-muted-foreground">
                  {String(values[field.key] || '').length}/{field.maxLength}
                </span>
              </label>
            ))}

            {category.tier === 2 && (
              <div>
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Attach a prescription or photo
                </span>
                {attachment ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
                    <span className="flex items-center gap-1.5 truncate text-[12.5px] text-foreground">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      {attachment.name}
                    </span>
                    <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-[12.5px] text-muted-foreground">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                    {uploading ? 'Attaching…' : 'Choose a file'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(file);
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            )}

            <Button onClick={preview} disabled={busy || missing} className="h-11 w-full">
              {busy ? 'Preparing…' : 'Review what would be said'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}