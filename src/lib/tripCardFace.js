/**
 * tripCardFace — what the card itself says.
 *
 * The card face is the only part of this whole surface that has to work with no
 * scan, no signal, no app and no battery. So the copy is fixed here, in one
 * place, and the PDF and the on-screen preview both read it. Nothing is drafted.
 */

export const PRINT_INSTRUCTION =
  'Keep one card in the bag you carry out of the room, and one on the bedside table where anyone walking in would see it. Never the room safe or your suitcase. Your phone dying or being lost is exactly the moment this card earns its place.';

export const FRONT_LINE = 'This traveller is protected by M-care.';
export const BACK_LINE_EN = 'Scan for help.';
export const BACK_CALL_EN = 'Or call the number on the other side.';

/** The back of the card, in the language of the country the card is in. */
export const CARD_BACK = {
  es: { scan: 'Escanee para pedir ayuda.', call: 'O llame al número del otro lado.' },
  pt: { scan: 'Digitalize para pedir ajuda.', call: 'Ou ligue para o número do outro lado.' },
  fr: { scan: "Scannez pour de l'aide.", call: "Ou appelez le numéro de l'autre côté." },
  it: { scan: 'Scansiona per chiedere aiuto.', call: "Oppure chiami il numero sull'altro lato." },
  de: { scan: 'Scannen Sie für Hilfe.', call: 'Oder rufen Sie die Nummer auf der Rückseite an.' },
  tr: { scan: 'Yardım için okutun.', call: 'Ya da diğer yüzdeki numarayı arayın.' },
  th: { scan: 'สแกนเพื่อขอความช่วยเหลือ', call: 'หรือโทรตามหมายเลขด้านหลัง' },
  ar: { scan: 'امسح طلبًا للمساعدة.', call: 'أو اتصل بالرقم على الوجه الآخر.' },
  zh: { scan: '扫码求助。', call: '或拨打背面的号码。' },
  en: { scan: BACK_LINE_EN, call: BACK_CALL_EN },
};

export function cardBack(lang) {
  return CARD_BACK[lang] || CARD_BACK.en;
}