import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const DOCUMENT_TYPES = [
  { value: 'business_license', label: 'Business License', required: true },
  { value: 'professional_license', label: 'Professional License', required: true },
  { value: 'insurance_certificate', label: 'Insurance Certificate', required: true },
  { value: 'registration', label: 'Registration Documents', required: false },
  { value: 'identity', label: 'Identity Verification', required: true },
  { value: 'certification', label: 'Certifications', required: false },
];

export default function DocumentUploader({ partnerType, onComplete }) {
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (docType, file) => {
    setUploading(true);
    setError(null);

    try {
      // Upload file to private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      const newDoc = {
        document_type: docType,
        file_uri,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      };

      setUploadedDocs(prev => [...prev, newDoc]);
      
      if (onComplete) {
        onComplete([...uploadedDocs, newDoc]);
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
  const optionalDocs = DOCUMENT_TYPES.filter(d => !d.required);
  const uploadedCount = uploadedDocs.length;
  const requiredUploaded = uploadedDocs.filter(d => 
    requiredDocs.some(rd => rd.value === d.document_type)
  ).length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-800">Document Upload Progress</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {requiredUploaded}/{requiredDocs.length} required documents uploaded
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{Math.round((requiredUploaded / requiredDocs.length) * 100)}%</p>
          </div>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-2 mt-3">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(requiredUploaded / requiredDocs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Required Documents */}
      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Required Documents
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {requiredDocs.map(doc => {
            const uploaded = uploadedDocs.find(d => d.document_type === doc.value);
            return (
              <div key={doc.value} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Required</p>
                  </div>
                  {uploaded ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                {!uploaded && (
                  <div className="mt-3">
                    <Label className="text-xs">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files[0] && handleFileUpload(doc.value, e.target.files[0])}
                      />
                      <span className="cursor-pointer text-blue-600 hover:underline text-xs">
                        Upload {uploaded ? 'Another' : 'Document'} →
                      </span>
                    </Label>
                  </div>
                )}
                {uploaded && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ {uploaded.file_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Documents */}
      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Optional Documents (Recommended)
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {optionalDocs.map(doc => {
            const uploaded = uploadedDocs.find(d => d.document_type === doc.value);
            return (
              <div key={doc.value} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Optional</p>
                  </div>
                  {uploaded ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5" />
                  )}
                </div>
                {!uploaded && (
                  <div className="mt-3">
                    <Label className="text-xs">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files[0] && handleFileUpload(doc.value, e.target.files[0])}
                      />
                      <span className="cursor-pointer text-blue-600 hover:underline text-xs">
                        Upload →
                      </span>
                    </Label>
                  </div>
                )}
                {uploaded && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ {uploaded.file_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {uploading && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-600">Uploading and encrypting...</p>
        </div>
      )}
    </div>
  );
}