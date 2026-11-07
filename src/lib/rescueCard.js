/**
 * Pure helpers for the printed rescue card (RescueCardPanel). Unit-tested in
 * tests/rescueCard.test.js.
 *
 * The QR code holds a ready-to-send text message, not a web link, so
 * scanning it never needs internet and sending it needs only a phone
 * signal. The server side (what a text means, what M-Care replies) is
 * base44/shared/rescueCardText.ts, which uses the same four languages.
 */

/**
 * The QR's contents: "SMSTO:<number>:RESCUE <code>". Phone cameras open the
 * texting app with the number filled in. Whether the message text is also
 * filled in varies by phone, which is why the code is printed large too.
 * Returns null unless the number is in +<country code> form.
 */
export function buildRescueSmsQr(number, code, keyword = 'RESCUE') {
  const n = String(number || '').trim();
  const c = String(code || '').trim().toUpperCase();
  if (!/^\+\d{7,15}$/.test(n) || !/^[A-Z0-9]{6}$/.test(c)) return null;
  return `SMSTO:${n}:${keyword} ${c}`;
}

/** "K7Q2M9" -> "K7Q 2M9", easier to read off a card. */
export function formatRescueCode(code) {
  const c = String(code || '').toUpperCase();
  return c.length === 6 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}

const COPY = {
  en: {
    title: 'RESCUE CARD',
    scan: 'If I need help, please scan this or text the code.',
    text: (kw, code, num) => `No QR scanner? Text ${kw} ${code} to ${num}.`,
    signal: 'It needs only a phone signal, not internet.',
    emergency: (em) => `Emergency? Call ${em}.`,
    unknownEmergency: 'the local emergency number',
    private: 'This card shows no personal details.',
  },
  es: {
    title: 'TARJETA DE RESCATE',
    scan: 'Si necesito ayuda, escanee esto o envíe el código por mensaje.',
    text: (kw, code, num) => `¿No puede escanear? Envíe ${kw} ${code} al ${num}.`,
    signal: 'Solo necesita señal de teléfono, no internet.',
    emergency: (em) => `¿Emergencia? Llame al ${em}.`,
    unknownEmergency: 'número de emergencias local',
    private: 'Esta tarjeta no muestra datos personales.',
  },
  pt: {
    title: 'CARTÃO DE RESGATE',
    scan: 'Se eu precisar de ajuda, escaneie isto ou envie o código por mensagem.',
    text: (kw, code, num) => `Não consegue escanear? Envie ${kw} ${code} para ${num}.`,
    signal: 'Só precisa de sinal de telefone, não de internet.',
    emergency: (em) => `Emergência? Ligue para ${em}.`,
    unknownEmergency: 'número de emergência local',
    private: 'Este cartão não mostra dados pessoais.',
  },
  fr: {
    title: 'CARTE DE SECOURS',
    scan: "Si j'ai besoin d'aide, scannez ceci ou envoyez le code par SMS.",
    text: (kw, code, num) => `Pas de lecteur QR ? Envoyez ${kw} ${code} au ${num}.`,
    signal: "Il suffit d'un signal téléphonique, pas d'internet.",
    emergency: (em) => `Urgence ? Appelez le ${em}.`,
    unknownEmergency: "numéro d'urgence local",
    private: 'Cette carte ne montre aucune donnée personnelle.',
  },
};

/**
 * The card's wording: each line in the trip country's language and in
 * English. When that language is English, `local` is null and only the
 * English line is printed.
 *
 * @param {string} lang 'en' | 'es' | 'pt' | 'fr' (anything else prints English only)
 * @param {{ keyword?: string, code: string, smsNumber: string, emergencyNumber?: string | null }} card
 */
export function rescueCardText(lang, card) {
  const local = COPY[lang] && lang !== 'en' ? COPY[lang] : null;
  const en = COPY.en;
  const kw = card.keyword || 'RESCUE';
  const code = String(card.code || '').toUpperCase();
  const line = (pick) => ({ local: local ? pick(local) : null, en: pick(en) });
  return {
    title: line((c) => c.title),
    scan: line((c) => c.scan),
    text: line((c) => c.text(kw, code, card.smsNumber)),
    signal: line((c) => c.signal),
    emergency: line((c) => c.emergency(card.emergencyNumber || c.unknownEmergency)),
    private: line((c) => c.private),
  };
}
