/**
 * spokenLanguageDetect — a deliberately small, honest language guesser for
 * M-Care's multilingual voice layer.
 *
 * Real language ID needs a model; this is a heuristic that recognizes a
 * handful of very common function words and greetings per supported locale
 * and picks the language with the most hits. It's intentionally conservative
 * — it returns null rather than guess when no language clearly wins, so the
 * caller can fall back to the user's saved preference or the UI language
 * instead of locking onto a wrong one. Pure and unit-testable.
 *
 * Locale codes match src/i18n.js SUPPORTED_LANGUAGES.
 */

const CUES = {
  es: ['hola', 'ayuda', 'gracias', 'por favor', 'necesito', 'doctor', 'seguro', 'donde', 'cuando', 'buenos', 'quiero', 'no me siento', 'tengo'],
  fr: ['bonjour', 'aidez', 'merci', "s'il vous plaît", 'besoin', 'docteur', 'sécurisé', 'où', 'quand', 'bonsoir', 'je veux', 'aide'],
  de: ['hallo', 'hilfe', 'danke', 'bitte', 'brauche', 'arzt', 'sicher', 'wo', 'wann', 'guten', 'ich möchte', 'notfall'],
  it: ['ciao', 'aiuto', 'grazie', 'per favore', 'ho bisogno', 'dottore', 'sicuro', 'dove', 'quando', 'buongiorno', 'voglio'],
  pt: ['olá', 'olá ', 'ajuda', 'obrigado', 'obrigada', 'por favor', 'preciso', 'médico', 'seguro', 'onde', 'quando', 'bom dia', 'quero'],
  ar: ['مرحبا', 'مساعدة', 'شكرا', 'من فضلك', 'أحتاج', 'طبيب', 'آمن', 'أين', 'متى', 'صباح الخير', 'أريد'],
  zh: ['你好', '帮助', '谢谢', '请', '需要', '医生', '安全', '哪里', '什么时候', '早上好', '我想要'],
  tr: ['merhaba', 'yardım', 'teşekkür', 'lütfen', 'ihtiyac', 'doktor', 'güvenli', 'nerede', 'ne zaman', 'günaydın', 'istiyorum'],
  th: ['สวัสดี', 'ช่วย', 'ขอบคุณ', 'กรุณา', 'ต้องการ', 'หมอ', 'ปลอดภัย', 'ที่ไหน', 'เมื่อไหร่', 'อยาก'],
  ko: ['안녕', '도와', '감사', '주세요', '필요', '의사', '안전', '어디', '언제', '원해'],
  en: ['hello', 'help', 'thanks', 'please', 'need', 'doctor', 'safe', 'where', 'when', 'good morning', 'i want', "i'm"],
};

/**
 * @param {string} text
 * @returns {string | null} a locale code, or null if no language clearly wins
 */
export function detectSpokenLanguage(text) {
  const s = (text || '').toLowerCase();
  if (!s) return null;

  let best = null;
  let bestScore = 0;
  for (const [lang, words] of Object.entries(CUES)) {
    let score = 0;
    for (const w of words) {
      // word-boundary-ish match: require a non-letter (or string edge) on each
      // side for the latin-script languages; CJK/Thai/Arabic just use includes
      // since their scripts don't run together with latin spaces the same way.
      if (/[^\p{L}]/u.test(w[0] || ' ')) {
        if (s.includes(w)) score += 1;
      } else {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu');
        if (re.test(s)) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; best = lang; }
  }

  // Require at least 2 cue hits to commit — a single ambiguous word ("doctor",
  // "ok") isn't enough to switch the user's whole conversation language.
  return bestScore >= 2 ? best : null;
}

// Recognition locale for the continuous-listening engine, given a 2-letter
// language code. Defaults to en-US.
export function recognitionLocaleFor(lang) {
  if (!lang) return 'en-US';
  const map = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ar: 'ar-SA', zh: 'zh-CN', tr: 'tr-TR', th: 'th-TH', ko: 'ko-KR' };
  return map[lang] || 'en-US';
}