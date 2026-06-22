import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RadioGroup from './FormRadioGroup';

const docTypes = ['X-rays','Blood Work','MRI / CT Scans','Prescriptions','Photos for Review','Previous Procedure Reports','none'];

export default function Section10Documents({ form, update }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedNames, setUploadedNames] = useState([]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    update('uploaded_files', [...(form.uploaded_files || []), ...urls]);
    setUploadedNames(prev => [...prev, ...files.map(f => f.name)]);
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📎</span>
        <h3 className="font-display text-lg text-foreground">Medical Uploads</h3>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Upload Supporting Documents</Label>
        <RadioGroup
          value={form.document_types?.[0] || ''}
          onChange={v => update('document_types', v ? [v] : [])}
          options={docTypes.map(d => ({ label: d, value: d }))}
        />
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
        <input
          type="file"
          id="doc-upload"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.dcm"
          className="hidden"
          onChange={handleUpload}
        />
        <label htmlFor="doc-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{uploading ? 'Uploading...' : 'Click to Upload Files'}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG accepted • Secure & encrypted</p>
            </div>
          </div>
        </label>
      </div>

      {uploadedNames.length > 0 && (
        <div className="space-y-1.5">
          {uploadedNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}