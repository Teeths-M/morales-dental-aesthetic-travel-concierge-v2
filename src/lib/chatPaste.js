/**
 * Shared clipboard-paste handler for the M-Care chat inputs.
 *
 * Paste behaviour:
 *   - text  → appended to the current input value (so the native text paste
 *             still lands in the field, but we keep it predictable across browsers)
 *   - image → routed to the existing file upload handler (preview + send)
 *   - file  → routed to the existing file upload handler
 *
 * Edge cases: empty clipboard is a no-op; unsupported types fall back to
 * letting the browser do its default text paste; oversized files surface the
 * existing friendly toast (the upload handler enforces the 15MB limit).
 *
 * Mobile note: iOS/Android deliver long-press paste through the same `paste`
 * event, so this handler works for keyboard and touch paste alike.
 *
 * @param {ClipboardEvent} e
 * @param {{ onFile?:(f:File)=>void, disabled?:boolean, onError?:(msg:string)=>void }} [opts]
 */
export function handleChatPaste(e, { onFile, disabled = false, onError } = {}) {
  if (disabled || typeof onFile !== 'function') return; // let the browser handle it
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  let fileItem = null;
  for (const item of Array.from(items)) {
    if (item.kind === 'file') { fileItem = item; break; }
  }

  if (fileItem) {
    e.preventDefault(); // stop the image being dropped into the text field as junk
    const file = fileItem.getAsFile();
    if (!file) {
      onError?.('That paste was empty — nothing to attach.');
      return;
    }
    // Browsers often name pasted images "image.png"; keep it honest.
    const named = file.name && file.name !== 'image.png'
      ? file
      : new File([file], `pasted-${Date.now()}.${file.type.split('/')[1] || 'png'}`, { type: file.type });
    onFile(named);
    return;
  }

  // No file in the clipboard → let the native text paste proceed untouched.
  // (If a text item exists it will populate the input as usual; if the clipboard
  // is unsupported e.g. a weird PDF blob without a file kind, nothing happens
  // and we don't swallow the event.)
}