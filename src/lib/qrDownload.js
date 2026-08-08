/**
 * qrDownload.js — shared SVG->canvas->PNG export for qrcode.react QR codes.
 * Fully client-side, no network call, works offline. Third use of this exact
 * mechanic (after QRCodeDisplay.jsx and TravelPassCard.jsx's local QRBlock) —
 * pulled out here instead of a third copy-paste.
 */
export function downloadQrSvgAsPng(svgEl, filename, padding = 16) {
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width + padding * 2;
    canvas.height = img.height + padding * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, padding, padding);
    URL.revokeObjectURL(svgUrl);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  };
  img.src = svgUrl;
}
