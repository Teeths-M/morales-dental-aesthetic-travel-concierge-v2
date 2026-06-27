import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Upload, CheckCircle2, Clock, AlertTriangle, Shield, Loader2 } from 'lucide-react';

const requiredDocs = [
  { key: 'xrays', label: 'Dental / Medical X-Rays', status: 'missing', icon: '🦷' },
  { key: 'labs', label: 'Lab Reports / Blood Work', status: 'pending', icon: '🧪' },
  { key: 'prescription', label: 'Current Prescriptions', status: 'verified', icon: '💊' },
  { key: 'passport', label: 'Passport Copy', status: 'verified', icon: '🛂' },
  { key: 'insurance', label: 'Travel / Medical Insurance', status: 'missing', icon: '📄' },
  { key: 'imaging', label: 'Medical Imaging (CT / MRI)', status: 'pending', icon: '🔬' },
];

const statusConfig = {
  verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, iconColor: 'text-amber-600' },
  missing: { label: 'Required', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
};

function DocCard({ doc, onUpload }) {
  const cfg = statusConfig[doc.status];
  const StatusIcon = cfg.icon;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl flex-shrink-0">{doc.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
        <div className={`inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
          <StatusIcon className={`w-3 h-3 ${cfg.iconColor}`} />
          {cfg.label}
        </div>
      </div>
      {doc.status !== 'verified' && (
        <button
          onClick={() => onUpload(doc.key)}
          className="flex-shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all"
        >
          Upload
        </button>
      )}
      {doc.status === 'verified' && (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      )}
    </div>
  );
}

export default function DocumentsModule() {
  const [uploading, setUploading] = useState(null);
  const [uploaded,  setUploaded]  = useState([]);
  const [dragging,  setDragging]  = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null); // { type: 'success'|'error', text }
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const MAX_MB = 25;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadMsg({ type: 'error', text: `That file is over ${MAX_MB}MB. Please compress it and try again.` });
      return;
    }
    setUploading(file.name);
    setUploadMsg(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploaded(prev => [...prev, { name: file.name, url: file_url }]);
      setUploadMsg({ type: 'success', text: `✅ "${file.name}" is safely stored in your Vault.` });
      setTimeout(() => setUploadMsg(null), 5000);
    } catch {
      setUploadMsg({ type: 'error', text: `We couldn't upload your file. Please check your connection and try again.` });
    } finally {
      setUploading(null);
    }
  };

  const missing = requiredDocs.filter(d => d.status === 'missing').length;
  const verified = requiredDocs.filter(d => d.status === 'verified').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Secure encrypted document management</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">Encrypted Storage</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Verified', value: verified, color: 'emerald' },
          { label: 'Pending Review', value: requiredDocs.filter(d => d.status === 'pending').length, color: 'amber' },
          { label: 'Required', value: missing, color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 text-center">
            <p className={`text-2xl font-semibold ${s.color === 'emerald' ? 'text-emerald-600' : s.color === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Alert */}
      {missing > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">SAFE-T 4LIFE™ Document Alert</p>
            <p className="text-xs text-amber-700 mt-0.5">{missing} required document{missing > 1 ? 's are' : ' is'} still missing. Your case cannot proceed to doctor review until all required documents are submitted.</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-sm text-emerald-700 font-semibold">Uploading {uploading}…</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Drag & drop or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DICOM — max 25MB</p>
          </>
        )}
      </div>

      {/* Upload feedback message */}
      <AnimatePresence>
        {uploadMsg && (
          <motion.div
            key="upload-msg"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              uploadMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {uploadMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded files */}
      <AnimatePresence>
        {uploaded.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-800 flex-1 truncate">{f.name}</p>
            <a href={f.url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 underline">View</a>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Required docs list */}
      <div className="space-y-3">
        {requiredDocs.map(doc => <DocCard key={doc.key} doc={doc} onUpload={() => fileRef.current?.click()} />)}
      </div>
    </div>
  );
}