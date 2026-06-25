import React from 'react';
import { motion } from 'framer-motion';

const WHATSAPP_GREEN = '#25D366';

/* WhatsApp SVG logo — matches the brand mark exactly */
function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={WHATSAPP_GREEN}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.527 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.733-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.528-5.208-1.443l-.374-.222-3.405.874.89-3.328-.241-.385A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

export default function WhatsAppButton() {
  const whatsappUrl = 'https://wa.me/18005550199?text=Hello%20Morales%20Concierge%2C%20I%20would%20like%20to%20learn%20more%20about%20your%20services.';

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5"
      style={{
        padding: '10px 18px 10px 14px',
        borderRadius: 999,
        background: 'rgba(6,11,22,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(37,211,102,0.35)`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(37,211,102,0.08)',
        textDecoration: 'none',
      }}
    >
      {/* Live status dot */}
      <span
        style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: WHATSAPP_GREEN,
          boxShadow: `0 0 6px ${WHATSAPP_GREEN}`,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <WhatsAppIcon size={15} />
      <span
        className="hidden sm:inline text-xs font-bold tracking-widest uppercase"
        style={{ color: WHATSAPP_GREEN, letterSpacing: '0.12em' }}
      >
        WhatsApp
      </span>
    </motion.a>
  );
}
