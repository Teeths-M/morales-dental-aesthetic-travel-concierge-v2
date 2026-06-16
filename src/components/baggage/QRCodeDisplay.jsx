import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2 } from 'lucide-react';

export default function QRCodeDisplay({ bag, onClose }) {
  const appUrl = window.location.origin;
  const finderUrl = `${appUrl}/luggage/${bag.finder_contact_token}`;

  // Use a free QR generation service (no npm needed)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(finderUrl)}&bgcolor=ffffff&color=1e293b&margin=10`;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `morales-luggage-${bag.token_code}.png`;
    a.target = '_blank';
    a.click();
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

        <h3 className="font-bold text-gray-900 text-lg mb-1">{bag.bag_label || `Bag ${bag.bag_number}`}</h3>
        <p className="text-xs text-gray-400 font-mono mb-6">{bag.token_code}</p>

        {/* QR Code */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 inline-block">
          <img src={qrSrc} alt="Luggage QR Code" className="w-[200px] h-[200px] mx-auto" />
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