// Real, enforced file type/size validation for every upload in the app —
// the HTML <input accept="..."> attribute alone is only a picker hint; a
// user can still select or drag in any file it doesn't match. Call this
// before invoking base44.integrations.Core.UploadFile/UploadPrivateFile.
export function validateFile(file, preset) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (!preset?.allowedTypes?.length) {
    throw new Error('validateFile: preset must define allowedTypes');
  }
  if (!preset.allowedTypes.includes(file.type)) {
    return { valid: false, error: `That file type isn't supported. Allowed: ${preset.allowedTypes.join(', ')}` };
  }
  const maxBytes = preset.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File is too large — max ${preset.maxSizeMB}MB.` };
  }
  return { valid: true, error: null };
}
