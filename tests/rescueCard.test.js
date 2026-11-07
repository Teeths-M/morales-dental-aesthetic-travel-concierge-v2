import { describe, it, expect } from 'vitest';
import {
  RESCUE_CODE_ALPHABET, isWellFormedCode, generateRescueCode,
  findRescueCodeCandidates, hasRescueKeyword, languageForCountry, languageForPhone,
  helperReply, isOptOut, parseYesNo, nextHelperStep, safeForwardText, emergencyAlertText,
  firstName, LINK_ONLY_LINES, LINK_ONLY_PARTNER_LINES,
} from '../base44/shared/rescueCardText.ts';
import { sameStoredPhone } from '../base44/shared/phoneMatch.ts';
import { assertLinkOnly } from '../base44/shared/notify.ts';
import { buildRescueSmsQr, formatRescueCode, rescueCardText } from '../src/lib/rescueCard.js';

describe('rescue codes', () => {
  it('leave out characters people misread off a printed card', () => {
    for (const ch of '01OIL') expect(RESCUE_CODE_ALPHABET).not.toContain(ch);
  });

  it('are 6 characters with at least two digits and two letters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRescueCode();
      expect(code).toHaveLength(6);
      expect(isWellFormedCode(code)).toBe(true);
      expect(code.replace(/[^2-9]/g, '').length).toBeGreaterThanOrEqual(2);
      expect(code.replace(/[2-9]/g, '').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('reject words, house numbers and phone numbers', () => {
    expect(isWellFormedCode('STREET')).toBe(false);
    expect(isWellFormedCode('222345')).toBe(false);
    expect(isWellFormedCode('K7Q2M')).toBe(false);
    expect(isWellFormedCode('K7Q2M9')).toBe(true);
    expect(isWellFormedCode('K0Q2M9')).toBe(false); // 0 isn't in the alphabet
  });

  it('skip the random bytes that would favour some characters', () => {
    // 256 isn't a multiple of 31, so bytes 248-255 are dropped instead of
    // wrapping around. Here the first three are dropped, and 8,9,10,0,1,2
    // map to A,B,C,2,3,4.
    const stream = [250, 255, 248, 8, 9, 10, 0, 1, 2];
    const random = (len) => Uint8Array.from({ length: len }, (_, i) => stream[i] ?? 0);
    expect(generateRescueCode(random)).toBe('ABC234');
  });

  it('use every alphabet character', () => {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) for (const ch of generateRescueCode()) seen.add(ch);
    expect(seen.size).toBe(RESCUE_CODE_ALPHABET.length);
  });
});

describe('finding a code in a text', () => {
  it('reads the pre-filled message and the ways people retype it', () => {
    expect(findRescueCodeCandidates('RESCUE K7Q2M9')).toEqual(['K7Q2M9']);
    expect(findRescueCodeCandidates('rescue k7q2m9')).toEqual(['K7Q2M9']);
    expect(findRescueCodeCandidates('K7Q 2M9')).toEqual(['K7Q2M9']);
    expect(findRescueCodeCandidates('K7Q-2M9')).toEqual(['K7Q2M9']);
    expect(findRescueCodeCandidates('my code is K7Q2M9.')).toEqual(['K7Q2M9']);
  });

  it('finds nothing in ordinary replies, safety commands or SOS packets', () => {
    expect(findRescueCodeCandidates('She is at the Oxxo on Avenida Juarez')).toEqual([]);
    expect(findRescueCodeCandidates('SAFE')).toEqual([]);
    expect(findRescueCodeCandidates('SOS')).toEqual([]);
    expect(findRescueCodeCandidates('MORALESHELP')).toEqual([]);
    expect(findRescueCodeCandidates('Call me on +18685550142')).toEqual([]);
  });

  it('spots the keyword alone', () => {
    expect(hasRescueKeyword('Rescue')).toBe(true);
    expect(hasRescueKeyword('rescue please')).toBe(true);
    expect(hasRescueKeyword('I need a rescue')).toBe(false);
  });
});

describe('language', () => {
  it('follows the trip country, and defaults to English', () => {
    expect(languageForCountry('Mexico')).toBe('es');
    expect(languageForCountry('Dominican Republic')).toBe('es');
    expect(languageForCountry('Brazil')).toBe('pt');
    expect(languageForCountry('Haiti')).toBe('fr');
    expect(languageForCountry('Trinidad and Tobago')).toBe('en');
    expect(languageForCountry(null)).toBe('en');
  });

  it('follows the helper\'s own number when there is no trip to go by', () => {
    expect(languageForPhone('+525512345678')).toBe('es');
    expect(languageForPhone('+18095551234')).toBe('es'); // Dominican Republic, not the US
    expect(languageForPhone('+12125551234')).toBe('en');
    expect(languageForPhone('+5511912345678')).toBe('pt');
    expect(languageForPhone('+50937123456')).toBe('fr');
    expect(languageForPhone('5512345678')).toBe('en');
  });
});

describe('replies to the helper', () => {
  it('put the local language first, then English', () => {
    const r = helperReply('es', 'ask_awake');
    expect(r.indexOf('despierta')).toBeLessThan(r.indexOf('awake'));
    expect(helperReply('en', 'ask_awake')).not.toContain('\n');
  });

  it('only ever fill in the emergency number', () => {
    expect(helperReply('en', 'done_no', '911')).toContain('call 911');
    expect(helperReply('fr', 'done_no', '15')).toContain('appelez le 15');
    expect(helperReply('en', 'done_no', null)).toContain('your local emergency number');
    for (const lang of ['en', 'es', 'pt', 'fr']) {
      for (const key of ['first_ask', 'first_ack', 'first_ask_unreached', 'first_ack_unreached', 'ask_awake',
        'ask_callback', 'ask_callback_urgent', 'done_yes', 'done_no', 'thanks', 'need_code', 'unknown_code', 'not_active']) {
        const r = helperReply(lang, key, '911');
        expect(r, `${lang}/${key}`).not.toMatch(/\{[a-z]+\}/);
        expect(r.length, `${lang}/${key}`).toBeGreaterThan(20);
      }
    }
  });
});

describe('reading the helper\'s answers', () => {
  it('understands yes and no in four languages', () => {
    for (const yes of ['YES', 'yes she is', 'Sí', 'si', 'SIM', 'oui', 'ok']) expect(parseYesNo(yes)).toBe('yes');
    for (const no of ['NO', 'no.', 'NÃO', 'nao', 'non']) expect(parseYesNo(no)).toBe('no');
    expect(parseYesNo('she is bleeding')).toBe(null);
  });

  it('treats STOP and its synonyms as an opt-out, and nothing else', () => {
    for (const w of ['STOP', 'stop', 'Unsubscribe', 'cancel', 'END', 'quit!']) expect(isOptOut(w)).toBe(true);
    expect(isOptOut('please do not stop helping')).toBe(false);
  });

  it('asks the three questions in order, and never loops', () => {
    let s = nextHelperStep('awaiting_location', 'Oxxo on Av Juarez');
    expect(s.updates).toMatchObject({ reported_location: 'Oxxo on Av Juarez', step: 'awaiting_awake' });
    expect(s.replyKey).toBe('ask_awake');
    expect(s.alertKind).toBe('location');

    s = nextHelperStep('awaiting_awake', 'no');
    expect(s.updates).toMatchObject({ reported_awake: 'no', step: 'awaiting_callback' });
    expect(s.replyKey).toBe('ask_callback_urgent');
    expect(s.alertKind).toBe('not_awake');

    s = nextHelperStep('awaiting_awake', 'she is talking a bit');
    expect(s.updates.reported_awake).toBe('unclear');
    expect(s.replyKey).toBe('ask_callback');

    s = nextHelperStep('awaiting_callback', 'yes');
    expect(s.updates).toMatchObject({ callback_consent: true, step: 'done' });
    expect(s.alertKind).toBe('callback');

    // Anything but a clear yes keeps the helper's number private.
    s = nextHelperStep('awaiting_callback', 'maybe later');
    expect(s.updates.callback_consent).toBe(false);
    expect(s.replyKey).toBe('done_no');

    s = nextHelperStep('done', 'the ambulance is here');
    expect(s.replyKey).toBe('thanks');
    expect(s.alertKind).toBe('message');
  });
});

describe('what reaches the family', () => {
  it('drops links a stranger might slip into a message', () => {
    expect(safeForwardText('pay here http://evil.example/x now')).toBe('pay here [link removed] now');
    expect(safeForwardText('see www.evil.com')).toBe('see [link removed]');
    expect(safeForwardText('go to scam.xyz/pay')).toBe('go to [link removed]');
    expect(safeForwardText('Oxxo, Av. Juárez 12')).toBe('Oxxo, Av. Juárez 12');
  });

  it('passes on the reported place, but never the helper\'s number unless they agreed', () => {
    const loc = emergencyAlertText('location', { name: 'Keisha', location: 'Oxxo http://x.co/y', url: 'https://m/g/t' });
    expect(loc).toContain('Keisha is at: "Oxxo [link removed]"');
    expect(emergencyAlertText('opened', { name: 'Keisha', url: 'https://m/g/t' })).not.toMatch(/\+\d{7,}/);
    expect(emergencyAlertText('callback', { name: 'Keisha', helperPhone: '+525512345678', url: null })).toContain('+525512345678');
  });

  it('link-only lines pass the link-only guard', () => {
    for (const { title, line } of Object.values(LINK_ONLY_LINES)) {
      expect(() => assertLinkOnly(`${title} ${line}`, 'test')).not.toThrow();
    }
    expect(() => assertLinkOnly(`${LINK_ONLY_PARTNER_LINES.title} ${LINK_ONLY_PARTNER_LINES.line}`, 'test')).not.toThrow();
  });

  it('uses the first name only', () => {
    expect(firstName('Keisha Ann Thomas')).toBe('Keisha');
    expect(firstName('')).toBe('');
  });
});

describe('matching a texting number to a saved number', () => {
  it('matches however the saved number was typed', () => {
    expect(sameStoredPhone('+18685550142', '+18685550142')).toBe(true);
    expect(sameStoredPhone('+1 (868) 555-0142', '+18685550142')).toBe(true);
    expect(sameStoredPhone('868-555-0142', '+18685550142')).toBe(true);
    expect(sameStoredPhone('18685550142', '+18685550142')).toBe(true);
    expect(sameStoredPhone('07700 900123', '+447700900123')).toBe(true);
    expect(sameStoredPhone('00 44 7700 900123', '+447700900123')).toBe(true);
  });

  it('never matches a different country with the same ending', () => {
    // Same last 10 digits, different country code: a SAFE from one must
    // never answer the other's check-in.
    expect(sameStoredPhone('+18685550142', '+448685550142')).toBe(false);
    expect(sameStoredPhone('+1 868 555 0142', '+15550142')).toBe(false);
    expect(sameStoredPhone('', '+18685550142')).toBe(false);
    expect(sameStoredPhone('555', '+18685550142')).toBe(false);
  });
});

describe('the printed card', () => {
  it('holds a ready-to-send text message', () => {
    expect(buildRescueSmsQr('+18685550142', 'k7q2m9')).toBe('SMSTO:+18685550142:RESCUE K7Q2M9');
  });

  it('refuses a number that is not in +<country code> form', () => {
    expect(buildRescueSmsQr('868-555-0142', 'K7Q2M9')).toBe(null);
    expect(buildRescueSmsQr('', 'K7Q2M9')).toBe(null);
    expect(buildRescueSmsQr('+18685550142', 'K7Q')).toBe(null);
  });

  it('prints the code in two groups', () => {
    expect(formatRescueCode('K7Q2M9')).toBe('K7Q 2M9');
  });

  it('prints each line in the local language and English, or English alone', () => {
    const es = rescueCardText('es', { code: 'K7Q2M9', smsNumber: '+525512345678', emergencyNumber: '911' });
    expect(es.text.local).toBe('¿No puede escanear? Envíe RESCUE K7Q2M9 al +525512345678.');
    expect(es.text.en).toBe('No QR scanner? Text RESCUE K7Q2M9 to +525512345678.');
    expect(es.emergency.en).toBe('Emergency? Call 911.');
    const en = rescueCardText('en', { code: 'K7Q2M9', smsNumber: '+18685550142', emergencyNumber: null });
    expect(en.title.local).toBe(null);
    expect(en.emergency.en).toBe('Emergency? Call the local emergency number.');
  });
});
