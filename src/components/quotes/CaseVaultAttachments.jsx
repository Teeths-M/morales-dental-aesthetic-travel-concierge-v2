import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Loader2, Paperclip } from 'lucide-react';

/**
 * CaseVaultAttachments — the shared-documents panel inside the Care Room.
 * Shown to the assigned doctor only: lists the patient's vaulted medical
 * records / lab results / prescriptions for this case, each with a one-tap
 * download button that mints a short-lived signed URL server-side
 * (downloadCaseVaultDocument). The file content never lives in the chat body —
 * only a secure, audited download link, keeping PII out of the message thread.
 *
 * Props: caseId, theme ('dark' | 'light') — matches CaseThread's theme prop.
 */
const TYPE_LABELS = {
  medical_record: 'Medical Record',
  medical_report: 'Medical Report',
  lab_result: 'Lab Result',
  prescription: 'Prescription',
  insurance_document: 'Insurance',
  consent_document: 'Consent Form',
  other: 'Document',
};

export default function CaseVaultAttachments({ caseId, theme = 'light' }) {
  const dark = theme === 'dark';
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['case-vault-docs', caseId],
    enabled: !!caseId,
    refetchInterval: 30000,
    queryFn: () =>
      base44.functions.invoke('listCaseVaultDocuments', { case_id: caseId })
        .then((r) => r?.data?.documents || [])
        .catch(() => []),
  });

  const c = dark
    ? { border: '#2A3F4A', text: '#fff', sub: 'rgba(255,255,255,0.55)', card: 'rgba(255,255,255,0.04)' }
    : { border: '#e2e8f0', text: '#0f172a', sub: '#64748b', card: '#f8fafc' };

  const download = async (docId) => {
    if (downloadingId) return;
    setDownloadingId(docId);
    try {
      const res = await base44.functions.invoke('downloadCaseVaultDocument', { vault_document_id: docId });
      const data = res?.data || res;
      if (data?.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    } catch (_) {
      // the signed URL mint failed — the button re-enables on next render
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: c.sub, fontSize: 12 }}>
        <Loader2 size="13" className="animate-spin" /> Loading shared documents…
      </div>
    );
  }

  if (!documents.length) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: c.sub, fontSize: 12, fontWeight: 700 }}>
        <Paperclip size="13" /> Shared Documents ({documents.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {documents.map((d) => {
          const label = TYPE_LABELS[d.document_type] || 'Document';
          const date = d.created_date ? new Date(d.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const isDownloading = downloadingId === d.id;
          return (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              border: `1px solid ${c.border}`, borderRadius: 10, padding: '8px 11px', background: c.card,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <FileText size="15" style={{ color: c.sub, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: c.sub }}>
                    {date}{d.page_count > 1 ? ` · ${d.page_count} pages` : ''}{d.has_pdf ? ' · PDF' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => download(d.id)}
                disabled={!!downloadingId}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: '#D4AF37', color: '#060B16', border: 'none', borderRadius: 99,
                  padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  opacity: downloadingId ? 0.5 : 1,
                }}
              >
                {isDownloading ? <Loader2 size="12" className="animate-spin" /> : <Download size="12" />}
                {isDownloading ? 'Preparing…' : 'Download'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}