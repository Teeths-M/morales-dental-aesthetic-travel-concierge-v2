import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2 } from 'lucide-react';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);

export default function QRCodeDisplay({ bag, onClose }) {
  const appUrl = window.location.origin;
  const finderUrl = `${appUrl}/luggage/${bag.finder_contact_token}`;
  const qrContainerRef = useRef(null);

  // Rendered client-side (qrcode.react) — no network call, works offline,
  // unlike the previous api.qrserver.com <img> which silently broke without a connection.
  const handleDownload = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));

    const img = new Image();
    img.onload = () => {
      const padding = 20;
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
      a.download = `morales-luggage-${bag.token_code}.png`;
      a.click();
    };
    img.src = svgUrl;
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My Luggage QR Tag', text: `Morales Medical luggage tag — ${bag.bag_label}`, url: finderUrl });
    } else {
      navigator.clipboard.writeText(finderUrl);
    }
  };

  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🧳</span>
        </div>

        <h3 className="font-semibold text-gray-900 text-lg mb-1">{bag.bag_label || `Bag ${bag.bag_number}`}</h3>
        <p className="text-xs text-gray-400 font-mono mb-6">{bag.token_code}</p>

        {/* QR Code */}
        <div ref={qrContainerRef} className="bg-gray-50 rounded-2xl p-4 mb-4 inline-block">
          <QRCodeSVG value={finderUrl} size={200} bgColor="#ffffff" fgColor="#1e293b" level="M" />
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Print or screenshot this QR tag and attach it to your bag.<br />
          <span className="font-semibold text-gray-700">No personal details are exposed</span> — finders reach a secure return portal only.
        </p>

        <div className="flex gap-3">
          <button onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">
            <Download className="w-4 h-4" /> Save QR
          </button>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition-all">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}