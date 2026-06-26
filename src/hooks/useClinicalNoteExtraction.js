import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useClinicalNoteExtraction
 *
 * Calls the extractClinicalNote edge function and manages loading / error state.
 *
 * Usage:
 *   const { extract, data, isLoading, error, reset } = useClinicalNoteExtraction();
 *   await extract(noteText); // data populated on success
 */
export function useClinicalNoteExtraction() {
  const [isLoading, setIsLoading] = useState(false);
  const [data,      setData]      = useState(null);
  const [error,     setError]     = useState(null);

  const extract = useCallback(async (noteText) => {
    if (!noteText?.trim()) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await base44.functions.invoke('extractClinicalNote', { note_text: noteText.trim() });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setData(res.data);
      }
    } catch (_) {
      setError('Extraction failed. Check your connection and try again.');
    }
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { extract, data, isLoading, error, reset };
}
