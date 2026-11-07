/**
 * rescueCardText — the fixed wording and the pure logic behind the rescue
 * card. No network, no database: everything here is unit-tested
 * (tests/rescueCard.test.js).
 *
 * The rescue card is printed before a trip. If the traveler's phone dies,
 * anyone can scan its QR code, or type its code, to text the M-Care safety
 * number with only a phone signal. rescueCardFlow.ts does the alerting; this
 * file decides what a text means and what to say back.
 *
 * Two rules shape the wording:
 *   - A helper is a stranger, so nothing sent to them ever names or
 *     describes the traveler. Replies only ever take the local emergency
 *     number as a variable.
 *   - Every reply is fixed, reviewed text in the helper's likely language,
 *     with English alongside. No AI writes anything here.
 */

// ---- Codes -----------------------------------------------------------------

/** No 0/O, 1/I/L: characters people misread off a printed card. */
export const RESCUE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const RESCUE_CODE_LENGTH = 6;
/** The word printed before the code: "Text RESCUE K7Q2M9 to ...". */
export const RESCUE_KEYWORD = 'RESCUE';

const DIGIT_SET = new Set('23456789');

/**
 * A code always has at least two digits and two letters, so an ordinary word
 * ("STREET") or a house or phone number is never read as a code.
 */
export function isWellFormedCode(code: string): boolean {
  if (code.length !== RESCUE_CODE_LENGTH) return false;
  let digits = 0;
  for (const ch of code) {
    if (!RESCUE_CODE_ALPHABET.includes(ch)) return false;
    if (DIGIT_SET.has(ch)) digits++;
  }
  return digits >= 2 && code.length - digits >= 2;
}

/** A fresh random code. `random` is only replaceable for tests. */
export function generateRescueCode(
  random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  for (;;) {
    // 256 isn't a multiple of 31, so drop the bytes that would skew the
    // distribution instead of using them with %.
    const limit = 256 - (256 % RESCUE_CODE_ALPHABET.length);
    let code = '';
    while (code.length < RESCUE_CODE_LENGTH) {
      for (const b of random(16)) {
        if (b < limit && code.length < RESCUE_CODE_LENGTH) code += RESCUE_CODE_ALPHABET[b % RESCUE_CODE_ALPHABET.length];
      }
    }
    if (isWellFormedCode(code)) return code;
  }
}

/** "K7Q2M9" -> "K7Q 2M9", easier to read off a card. */
export function formatRescueCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Every rescue code a text could contain, however the helper typed it:
 * "RESCUE K7Q2M9", "k7q2m9", "K7Q 2M9", "K7Q-2M9", "my code is K7Q2M9."
 */
export function findRescueCodeCandidates(text: string): string[] {
  const tokens = String(text || '').toUpperCase().split(/\s+/)
    .map((t) => t.replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);
  const found = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (isWellFormedCode(tokens[i])) found.add(tokens[i]);
    // A code typed with a space in the middle arrives as two tokens.
    if (i + 1 < tokens.length) {
      const joined = tokens[i] + tokens[i + 1];
      if (isWellFormedCode(joined)) found.add(joined);
    }
  }
  return [...found];
}

/** True when the text starts with the rescue keyword ("rescue", "Rescue please"). */
export function hasRescueKeyword(text: string): boolean {
  return /^\s*rescue\b/i.test(String(text || ''));
}

// ---- Language --------------------------------------------------------------

export type RescueLang = 'en' | 'es' | 'pt' | 'fr';

const COUNTRY_LANG: Record<string, RescueLang> = {
  mexico: 'es', colombia: 'es', 'costa rica': 'es', 'dominican republic': 'es', panama: 'es',
  venezuela: 'es', argentina: 'es', spain: 'es', peru: 'es', chile: 'es', ecuador: 'es',
  guatemala: 'es', honduras: 'es', 'el salvador': 'es', nicaragua: 'es', uruguay: 'es',
  paraguay: 'es', bolivia: 'es', cuba: 'es', 'puerto rico': 'es',
  brazil: 'pt', portugal: 'pt',
  france: 'fr', haiti: 'fr', martinique: 'fr', guadeloupe: 'fr', 'french guiana': 'fr',
};

/**
 * The language a helper in this country most likely reads. Replies always
 * carry English as well, so a wrong guess still reads correctly. Countries
 * not listed get English only: add one here only together with a reviewed
 * translation below.
 */
export function languageForCountry(country?: string | null): RescueLang {
  return COUNTRY_LANG[String(country || '').trim().toLowerCase()] || 'en';
}

/** Calling codes for the same countries, longest first so +1809 wins over +1. */
const CALLING_CODE_LANG: Array<[string, RescueLang]> = ([
  ['1809', 'es'], ['1829', 'es'], ['1849', 'es'], ['1787', 'es'], ['1939', 'es'],
  ['506', 'es'], ['507', 'es'], ['593', 'es'], ['502', 'es'], ['504', 'es'], ['503', 'es'],
  ['505', 'es'], ['598', 'es'], ['595', 'es'], ['591', 'es'],
  ['52', 'es'], ['57', 'es'], ['58', 'es'], ['54', 'es'], ['34', 'es'], ['51', 'es'], ['56', 'es'], ['53', 'es'],
  ['351', 'pt'], ['55', 'pt'],
  ['509', 'fr'], ['596', 'fr'], ['590', 'fr'], ['594', 'fr'], ['33', 'fr'],
] as Array<[string, RescueLang]>).sort((a, b) => b[0].length - a[0].length);

/**
 * The language of the country a number belongs to, for a text that can't be
 * tied to a card (so there's no trip country to go by). Expects Twilio's
 * +<country code> format.
 */
export function languageForPhone(e164?: string | null): RescueLang {
  const raw = String(e164 || '').trim();
  if (!raw.startsWith('+')) return 'en';
  const digits = raw.replace(/\D/g, '');
  for (const [prefix, lang] of CALLING_CODE_LANG) if (digits.startsWith(prefix)) return lang;
  return 'en';
}

// ---- Replies to the helper -------------------------------------------------

export type ReplyKey =
  | 'first_ask' | 'first_ack' | 'first_ask_unreached' | 'first_ack_unreached'
  | 'ask_awake' | 'ask_callback' | 'ask_callback_urgent' | 'done_yes' | 'done_no'
  | 'thanks' | 'need_code' | 'unknown_code' | 'not_active';

/** {em} is the only variable: the local emergency number. */
const REPLIES: Record<RescueLang, Record<ReplyKey, string>> = {
  en: {
    first_ask: 'M-Care safety team: thank you for helping. We are alerting our safety team and the emergency contacts of the person this card belongs to now. Where is this person? Please reply with a street, landmark or business name.',
    first_ack: 'M-Care safety team: thank you for helping. We are alerting our safety team and the emergency contacts of the person this card belongs to now. Please stay with them if you can. If they need urgent medical help, call {em}.',
    first_ask_unreached: "M-Care safety team: thank you for helping. We could not reach this person's contacts yet. If they need urgent help, call {em} now. Where is this person? Please reply with a street, landmark or business name.",
    first_ack_unreached: "M-Care safety team: thank you for helping. We could not reach this person's contacts yet. If they need urgent help, call {em} now.",
    ask_awake: 'Thank you. Is the person awake and able to talk? Reply YES or NO.',
    ask_callback: 'Thank you. May their family call you on this number? Reply YES or NO.',
    ask_callback_urgent: 'If they are not responding or not breathing, call {em} now. May their family call you on this number? Reply YES or NO.',
    done_yes: 'Thank you. Their family may call you. Please stay with them if you can. If they need urgent medical help, call {em}.',
    done_no: 'Thank you. We will not share your number. Please stay with them if you can. If they need urgent medical help, call {em}.',
    thanks: 'Thank you. We have passed this on to their family and our safety team.',
    need_code: 'M-Care safety team: to help someone with an M-Care rescue card, please text the 6-character code printed on the card.',
    unknown_code: 'M-Care safety team: we do not recognise that code. Please check the card and text the 6-character code again. If someone needs urgent help, call your local emergency number now.',
    not_active: 'M-Care safety team: that code is no longer active. If someone needs urgent help, call your local emergency number now.',
  },
  es: {
    first_ask: 'Equipo de seguridad de M-Care: gracias por ayudar. Estamos avisando ahora a nuestro equipo de seguridad y a los contactos de emergencia de la persona a quien pertenece esta tarjeta. ¿Dónde está esta persona? Responda con una calle, un lugar conocido o el nombre de un negocio.',
    first_ack: 'Equipo de seguridad de M-Care: gracias por ayudar. Estamos avisando ahora a nuestro equipo de seguridad y a los contactos de emergencia de la persona a quien pertenece esta tarjeta. Por favor, quédese con ella si puede. Si necesita ayuda médica urgente, llame al {em}.',
    first_ask_unreached: 'Equipo de seguridad de M-Care: gracias por ayudar. Todavía no hemos podido contactar a los contactos de emergencia de esta persona. Si necesita ayuda urgente, llame ahora al {em}. ¿Dónde está esta persona? Responda con una calle, un lugar conocido o el nombre de un negocio.',
    first_ack_unreached: 'Equipo de seguridad de M-Care: gracias por ayudar. Todavía no hemos podido contactar a los contactos de emergencia de esta persona. Si necesita ayuda urgente, llame ahora al {em}.',
    ask_awake: 'Gracias. ¿La persona está despierta y puede hablar? Responda SÍ o NO.',
    ask_callback: 'Gracias. ¿Puede la familia de esta persona llamarle a este número? Responda SÍ o NO.',
    ask_callback_urgent: 'Si no responde o no respira, llame ahora al {em}. ¿Puede la familia de esta persona llamarle a este número? Responda SÍ o NO.',
    done_yes: 'Gracias. La familia de esta persona puede llamarle. Por favor, quédese con ella si puede. Si necesita ayuda médica urgente, llame al {em}.',
    done_no: 'Gracias. No compartiremos su número. Por favor, quédese con ella si puede. Si necesita ayuda médica urgente, llame al {em}.',
    thanks: 'Gracias. Se lo hemos pasado a la familia de esta persona y a nuestro equipo de seguridad.',
    need_code: 'Equipo de seguridad de M-Care: para ayudar a alguien con una tarjeta de rescate de M-Care, envíe por mensaje el código de 6 caracteres impreso en la tarjeta.',
    unknown_code: 'Equipo de seguridad de M-Care: no reconocemos ese código. Revise la tarjeta y envíe de nuevo el código de 6 caracteres. Si alguien necesita ayuda urgente, llame ahora al número de emergencias local.',
    not_active: 'Equipo de seguridad de M-Care: ese código ya no está activo. Si alguien necesita ayuda urgente, llame ahora al número de emergencias local.',
  },
  pt: {
    first_ask: 'Equipe de segurança da M-Care: obrigado por ajudar. Estamos avisando agora a nossa equipe de segurança e os contatos de emergência da pessoa a quem este cartão pertence. Onde está essa pessoa? Responda com uma rua, um ponto de referência ou o nome de um estabelecimento.',
    first_ack: 'Equipe de segurança da M-Care: obrigado por ajudar. Estamos avisando agora a nossa equipe de segurança e os contatos de emergência da pessoa a quem este cartão pertence. Por favor, fique com ela se puder. Se ela precisar de ajuda médica urgente, ligue para {em}.',
    first_ask_unreached: 'Equipe de segurança da M-Care: obrigado por ajudar. Ainda não conseguimos falar com os contatos de emergência dessa pessoa. Se ela precisar de ajuda urgente, ligue agora para {em}. Onde está essa pessoa? Responda com uma rua, um ponto de referência ou o nome de um estabelecimento.',
    first_ack_unreached: 'Equipe de segurança da M-Care: obrigado por ajudar. Ainda não conseguimos falar com os contatos de emergência dessa pessoa. Se ela precisar de ajuda urgente, ligue agora para {em}.',
    ask_awake: 'Obrigado. A pessoa está acordada e consegue falar? Responda SIM ou NÃO.',
    ask_callback: 'Obrigado. A família dessa pessoa pode ligar para você neste número? Responda SIM ou NÃO.',
    ask_callback_urgent: 'Se ela não responder ou não estiver respirando, ligue agora para {em}. A família dessa pessoa pode ligar para você neste número? Responda SIM ou NÃO.',
    done_yes: 'Obrigado. A família dessa pessoa pode ligar para você. Por favor, fique com ela se puder. Se ela precisar de ajuda médica urgente, ligue para {em}.',
    done_no: 'Obrigado. Não vamos compartilhar o seu número. Por favor, fique com ela se puder. Se ela precisar de ajuda médica urgente, ligue para {em}.',
    thanks: 'Obrigado. Repassamos isso à família dessa pessoa e à nossa equipe de segurança.',
    need_code: 'Equipe de segurança da M-Care: para ajudar alguém com um cartão de resgate da M-Care, envie por mensagem o código de 6 caracteres impresso no cartão.',
    unknown_code: 'Equipe de segurança da M-Care: não reconhecemos esse código. Confira o cartão e envie novamente o código de 6 caracteres. Se alguém precisar de ajuda urgente, ligue agora para o número de emergência local.',
    not_active: 'Equipe de segurança da M-Care: esse código não está mais ativo. Se alguém precisar de ajuda urgente, ligue agora para o número de emergência local.',
  },
  fr: {
    first_ask: "Équipe de sécurité M-Care : merci de votre aide. Nous prévenons maintenant notre équipe de sécurité et les contacts d'urgence de la personne à qui appartient cette carte. Où se trouve cette personne ? Répondez avec une rue, un lieu connu ou le nom d'un commerce.",
    first_ack: "Équipe de sécurité M-Care : merci de votre aide. Nous prévenons maintenant notre équipe de sécurité et les contacts d'urgence de la personne à qui appartient cette carte. Restez avec elle si vous le pouvez. Si elle a besoin d'une aide médicale urgente, appelez le {em}.",
    first_ask_unreached: "Équipe de sécurité M-Care : merci de votre aide. Nous n'avons pas encore pu joindre les contacts d'urgence de cette personne. Si elle a besoin d'aide urgente, appelez le {em} maintenant. Où se trouve cette personne ? Répondez avec une rue, un lieu connu ou le nom d'un commerce.",
    first_ack_unreached: "Équipe de sécurité M-Care : merci de votre aide. Nous n'avons pas encore pu joindre les contacts d'urgence de cette personne. Si elle a besoin d'aide urgente, appelez le {em} maintenant.",
    ask_awake: 'Merci. La personne est-elle éveillée et capable de parler ? Répondez OUI ou NON.',
    ask_callback: 'Merci. La famille de cette personne peut-elle vous appeler à ce numéro ? Répondez OUI ou NON.',
    ask_callback_urgent: "Si elle ne répond pas ou ne respire pas, appelez le {em} maintenant. La famille de cette personne peut-elle vous appeler à ce numéro ? Répondez OUI ou NON.",
    done_yes: "Merci. La famille de cette personne pourra vous appeler. Restez avec elle si vous le pouvez. Si elle a besoin d'une aide médicale urgente, appelez le {em}.",
    done_no: "Merci. Nous ne partagerons pas votre numéro. Restez avec elle si vous le pouvez. Si elle a besoin d'une aide médicale urgente, appelez le {em}.",
    thanks: 'Merci. Nous avons transmis cela à sa famille et à notre équipe de sécurité.',
    need_code: "Équipe de sécurité M-Care : pour aider une personne qui a une carte de secours M-Care, envoyez par SMS le code de 6 caractères imprimé sur la carte.",
    unknown_code: "Équipe de sécurité M-Care : nous ne reconnaissons pas ce code. Vérifiez la carte et renvoyez le code de 6 caractères. Si quelqu'un a besoin d'aide urgente, appelez maintenant le numéro d'urgence local.",
    not_active: "Équipe de sécurité M-Care : ce code n'est plus actif. Si quelqu'un a besoin d'aide urgente, appelez maintenant le numéro d'urgence local.",
  },
};

const UNKNOWN_EMERGENCY_NUMBER: Record<RescueLang, string> = {
  en: 'your local emergency number',
  es: 'número de emergencias local',
  pt: 'número de emergência local',
  fr: "numéro d'urgence local",
};

/**
 * A reply to the helper: the local-language version first, then English.
 * Only the emergency number is filled in; nothing about the traveler is.
 */
export function helperReply(lang: RescueLang, key: ReplyKey, emergencyNumber?: string | null): string {
  const fill = (l: RescueLang) => REPLIES[l][key].replace('{em}', emergencyNumber || UNKNOWN_EMERGENCY_NUMBER[l]);
  return lang === 'en' ? fill('en') : `${fill(lang)}\n\n${fill('en')}`;
}

// ---- Reading the helper's replies ------------------------------------------

/** Twilio's standard opt-out words. After one of these, M-Care stops texting that number. */
export function isOptOut(text: string): boolean {
  return /^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(String(text || ''));
}

/** "yes" / "no" in English, Spanish, Portuguese or French, or null when it's neither. */
export function parseYesNo(text: string): 'yes' | 'no' | null {
  const first = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().split(/[^a-z]+/).filter(Boolean)[0] || '';
  if (['yes', 'y', 'yeah', 'yep', 'ok', 'okay', 'si', 'sim', 'oui'].includes(first)) return 'yes';
  if (['no', 'n', 'nope', 'nao', 'non'].includes(first)) return 'no';
  return null;
}

export type HelperStep = 'awaiting_location' | 'awaiting_awake' | 'awaiting_callback' | 'done';
export type AlertKind = 'location' | 'not_awake' | 'callback' | 'message';

/**
 * What a helper's reply means, given the question they were last asked.
 * Never loops: an answer that isn't clearly yes or no is recorded as
 * "unclear" and the next question follows, so nobody gets stuck. An unclear
 * answer about sharing their number counts as no.
 */
export function nextHelperStep(step: string | undefined, text: string): {
  updates: Record<string, unknown>;
  replyKey: ReplyKey;
  alertKind: AlertKind;
} {
  switch (step) {
    case 'awaiting_location':
      return {
        updates: { reported_location: clipText(text, 300), step: 'awaiting_awake' },
        replyKey: 'ask_awake',
        alertKind: 'location',
      };
    case 'awaiting_awake': {
      const awake = parseYesNo(text) || 'unclear';
      return {
        updates: { reported_awake: awake, step: 'awaiting_callback' },
        replyKey: awake === 'no' ? 'ask_callback_urgent' : 'ask_callback',
        alertKind: awake === 'no' ? 'not_awake' : 'message',
      };
    }
    case 'awaiting_callback': {
      const consent = parseYesNo(text) === 'yes';
      return {
        updates: { callback_consent: consent, step: 'done' },
        replyKey: consent ? 'done_yes' : 'done_no',
        alertKind: consent ? 'callback' : 'message',
      };
    }
    default:
      return { updates: {}, replyKey: 'thanks', alertKind: 'message' };
  }
}

// ---- Text from a helper, passed on to family --------------------------------

export function clipText(text: string, max: number): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * A helper's words as they may be passed on to family: one line, shortened,
 * and with any link removed. Someone holding a found card must not be able
 * to send a link to the traveler's family under M-Care's name.
 */
export function safeForwardText(text: string, max = 140): string {
  const noLinks = String(text || '')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/\b[a-z0-9-]+\.(?:com|net|org|info|biz|io|ly|me|app|link|co|xyz|top|site|online|click)(?:\/\S*)?/gi, '[link removed]');
  return clipText(noLinks, max);
}

/** The traveler's first name, for texts to their own family only. */
export function firstName(fullName?: string | null): string {
  return String(fullName || '').trim().split(/\s+/)[0] || '';
}

// ---- Alerts to the traveler's people ----------------------------------------

export type AlertStage = 'opened' | AlertKind;

/**
 * The emergency-mode text to family, companion and doctor. It names the
 * traveler and passes on where the helper says they are, under the
 * emergency exception in notify.ts (reason 'sos_triggered'): a family member
 * abroad may have no internet to open a link. Never includes the helper's
 * number unless they agreed.
 */
export function emergencyAlertText(stage: AlertStage, o: {
  name?: string; location?: string; helperPhone?: string; url?: string | null;
}): string {
  const who = o.name || 'your traveler';
  const link = o.url ? ` ${o.url}` : '';
  switch (stage) {
    case 'opened':
      return `URGENT from M-Care: someone with ${who} has asked for help using their rescue card. Our safety team has been told.${o.url ? ` Updates: ${o.url}` : ''}`;
    case 'location':
      return `Update from M-Care: the person helping ${who} says ${who} is at: "${safeForwardText(o.location || '')}".${link}`;
    case 'not_awake':
      return `URGENT update from M-Care: the person helping ${who} says ${who} is not awake or cannot talk. Our safety team has been told.${link}`;
    case 'callback':
      return `Update from M-Care: the person helping ${who} agreed you can call them on ${o.helperPhone || 'the number on the page'}.${link}`;
    case 'message':
    default:
      return `Update from M-Care: the person helping ${who} sent a new message.${link}`;
  }
}

/**
 * Link-only mode: a generic line and a link, for notify.ts's linkOnlySms and
 * linkOnlyEmail. Nothing private in them.
 */
export const LINK_ONLY_LINES: Record<AlertStage, { title: string; line: string }> = {
  opened: {
    title: 'Urgent: someone has asked M-Care for help for your traveler',
    line: 'A person with your traveler has contacted M-Care for help. Please open this link now.',
  },
  location: { title: 'New update about your traveler', line: 'There is a new update about your traveler. Please open this link.' },
  not_awake: { title: 'Urgent update about your traveler', line: 'There is an urgent update about your traveler. Please open this link now.' },
  callback: { title: 'New update about your traveler', line: 'There is a new update about your traveler. Please open this link.' },
  message: { title: 'New update about your traveler', line: 'There is a new update about your traveler. Please open this link.' },
};

/** Link-only lines for the doctor and companion, who reach the details through M-Care. */
export const LINK_ONLY_PARTNER_LINES = {
  title: 'Urgent: an M-Care patient may need help',
  line: 'An M-Care patient you work with may need help. Please open your M-Care portal or contact the M-Care team now.',
};
