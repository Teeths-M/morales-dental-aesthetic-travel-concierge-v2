import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle, Loader2, X, AlertTriangle, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RadioGroup from './FormRadioGroup';
import {
  buildUploadPacket,
  enqueueUpload,
  getUnsyncedUploads,
  markUploadSynced,
  markUploadError,
  canQueueOffline,
  base64ToFile,
} from '@/offline/upload/offlineUploadQueue';

const DOC_TYPES = [
  'X-rays',
  'Blood Work',
  'MRI / CT Scans',
  'Prescriptions',
  'Photos for Review',
  'Previous Procedure Reports',
  'None / Skip',
];

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXT  = '.pdf,.jpg,.jpeg,.png,.webp';
const MAX_MB        = 10;
const MAX_BYTES     = MAX_MB * 1024 * 1024;

function friendlyError(err, file) {
  if (file && file.size > MAX_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      title: 'File too large',
      body:  `"${file.name}" is ${sizeMB} MB. Please choose a file under ${MAX_MB} MB. That's okay — you can try with a different file.`,
      kind:  'error',
    };
  }
  if (file && !ACCEPTED_MIME.includes(file.type)) {
    return {
      title: 'File type not supported',
      body:  `"${file.name}" can't be uploaded. Please use a PDF, JPG, or PNG file.`,
      kind:  'error',
    };
  }
  const msg = (err?.message || '').toLowerCase();
  if (!navigator.onLine || msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return {
      title: 'No internet connection',
      body:  'Your file is saved on this device and will upload automatically when you reconnect.',
      kind:  'warn',
    };
  }
  return {
    title: "Upload didn't work",
    body:  "That's okay — please remove this file and try again. If it keeps failing, try a different format.",
    kind:  'error',
  };
}

export default function Section10Documents({ form, update }) {
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [dragOver, setDragOver]   = useState(false);
  // files: [{ id, name, status: 'uploading'|'done'|'queued'|'error', error?, url?, packetId? }]
  const [files, setFiles]         = useState([]);

  useEffect(() => {
    const up = () => { setIsOnline(true); syncQueued(); };
    const dn = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', dn);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncQueued = useCallback(async () => {
    const unsynced = getUnsyncedUploads();
    for (const packet of unsynced) {
      try {
        const file = base64ToFile(packet);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        markUploadSynced(packet.offline_packet_id, file_url);
        update('uploaded_files', [...(form.uploaded_files || []), file_url]);
        setFiles(prev => prev.map(f =>
          f.packetId === packet.offline_packet_id ? { ...f, status: 'done', url: file_url } : f
        ));
      } catch (_) {
        markUploadError(packet.offline_packet_id, 'retry_failed');
      }
    }
  }, [form, update]);

  const uploadOne = async (file) => {
    // Pre-validate before touching network
    if (file.size > MAX_BYTES) {
      const id = `${Date.now()}_${Math.random()}`;
      setFiles(prev => [...prev, { id, name: file.name, status: 'error', error: friendlyError(null, file) }]);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      const id = `${Date.now()}_${Math.random()}`;
      setFiles(prev => [...prev, { id, name: file.name, status: 'error', error: friendlyError(null, file) }]);
      return;
    }

    const id = `${Date.now()}_${Math.random()}`;

    if (!isOnline) {
      if (canQueueOffline(file)) {
        const packet = await buildUploadPacket({ file, documentType: form.document_types?.[0] || '' });
        enqueueUpload(packet);
        setFiles(prev => [...prev, { id, name: file.name, status: 'queued', packetId: packet.offline_packet_id }]);
      } else {
        setFiles(prev => [...prev, { id, name: file.name, status: 'error', error: {
          title: "Can't save offline",
          body: `"${file.name}" is over 1 MB, so it can't be saved while you're offline. Please connect to the internet and try again.`,
          kind: 'error',
        }}]);
      }
      return;
    }

    setFiles(prev => [...prev, { id, name: file.name, status: 'uploading' }]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update('uploaded_files', [...(form.uploaded_files || []), file_url]);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'done', url: file_url } : f));
    } catch (err) {
      const friendly = friendlyError(err, file);
      // Queue if it was a network error (kind='warn')
      if (friendly.kind === 'warn' && canQueueOffline(file)) {
        const packet = await buildUploadPacket({ file, documentType: form.document_types?.[0] || '' });
        enqueueUpload(packet);
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'queued', packetId: packet.offline_packet_id } : f));
      } else {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error: friendly } : f));
      }
    }
  };

  const handleInput = (e) => {
    Array.from(e.target.files).forEach(uploadOne);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadOne);
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📎</span>
          <h3 className="font-display text-lg text-foreground">Upload Your Medical Documents</h3>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isOnline
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-amber-50  text-amber-600  border border-amber-200'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Document type */}
      <div>
        <Label className="text-sm font-medium mb-3 block">What type of document are you uploading?</Label>
        <RadioGroup
          value={form.document_types?.[0] || ''}
          onChange={v => update('document_types', v ? [v] : [])}
          options={DOC_TYPES.map(d => ({ label: d, value: d }))}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          id="doc-upload"
          multiple
          accept={ACCEPTED_EXT}
          className="hidden"
          onChange={handleInput}
        />
        <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Tap to choose files, or drag and drop here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG · Up to {MAX_MB} MB each
            </p>
            {!isOnline && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                You're offline. Files will be saved here and uploaded when you reconnect.
              </p>
            )}
          </div>
          <span className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            Choose Files
          </span>
        </label>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className={`flex items-start gap-3 p-3 rounded-xl border ${
              f.status === 'done'      ? 'bg-emerald-50 border-emerald-200' :
              f.status === 'queued'   ? 'bg-amber-50  border-amber-200'  :
              f.status === 'error'    ? 'bg-red-50    border-red-200'    :
                                        'bg-slate-50   border-slate-200'
            }`}>
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {f.status === 'uploading' && <Loader2      className="w-4 h-4 text-primary animate-spin" />}
                {f.status === 'done'      && <CheckCircle  className="w-4 h-4 text-emerald-600" />}
                {f.status === 'queued'    && <WifiOff      className="w-4 h-4 text-amber-600" />}
                {f.status === 'error'     && <AlertTriangle className="w-4 h-4 text-red-600" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                {f.status === 'uploading' && (
                  <p className="text-xs text-slate-500">Uploading securely…</p>
                )}
                {f.status === 'done' && (
                  <p className="text-xs text-emerald-700">Saved successfully ✓</p>
                )}
                {f.status === 'queued' && (
                  <p className="text-xs text-amber-700">
                    Saved here — will upload when you reconnect to the internet.
                  </p>
                )}
                {f.status === 'error' && f.error && (
                  <div className="mt-0.5">
                    <p className="text-xs font-semibold text-red-800">{f.error.title}</p>
                    <p className="text-xs text-red-700">{f.error.body}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {(f.status === 'done' || f.status === 'error') && (
                <button
                  onClick={() => removeFile(f.id)}
                  title="Remove"
                  className="flex-shrink-0 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {f.status === 'error' && (
                <button
                  onClick={() => removeFile(f.id)}
                  title="Remove and try again"
                  className="flex-shrink-0 p-1 text-red-300 hover:text-red-500 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        🔒 All files are encrypted and access-controlled. Only your care team can view them.
      </p>
    </div>
  );
}
