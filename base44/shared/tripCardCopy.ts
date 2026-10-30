/**
 * The card's own words, in the trip-country language with English underneath.
 *
 * The person holding this card in Margarita is a Venezuelan who does not read
 * English. The traveller — the only English speaker nearby — may be the one who
 * cannot act. So local first, always, including the call label, which is the
 * single word they will actually use.
 *
 * These strings are fixed and pre-written. No model drafts anything a stranger
 * reads on this page.
 */

export interface CardCopy {
  needsHelp: string;
  line: string;
  cta: string;
  call: string;
  reassure: string;
  askWhere: string;
  share: string;
  address: string;
  addressPh: string;
  send: string;
  skip: string;
  sent: string;
  notShared: string;
  waiting: string;
  assigned: string;
  arrived: string;
  unresolved: string;
  held: string;
  continues: string;
  closed: string;
  invalidTitle: string;
  invalidNote: string;
  ref: string;
}

export const EN: CardCopy = {
  needsHelp: '{name} may need help',
  line: 'This traveller is with M-Care. If something is wrong, get help now.',
  cta: 'Get help for them',
  call: 'Call',
  reassure: 'M-Care has your request. Someone is being sent to them now.',
  askWhere: 'Where are they? This helps the driver find them.',
  share: 'Share my location',
  address: 'Type the address',
  addressPh: 'Street, building, area',
  send: 'Send',
  skip: 'Skip',
  sent: 'Location sent.',
  notShared: 'Location not shared.',
  waiting: 'M-Care is arranging a driver.',
  assigned: 'A driver has accepted and is on the way.',
  arrived: 'A driver has reached them.',
  unresolved: 'M-Care is calling you next.',
  held: 'M-Care has your request.',
  continues: 'Help continues whether or not this page stays open.',
  closed: 'M-Care has closed this request.',
  invalidTitle: 'This card is not active',
  invalidNote: 'Call the number below if someone needs help.',
  ref: 'Reference',
};

const COPY: Record<string, Partial<CardCopy>> = {
  es: {
    needsHelp: '{name} puede necesitar ayuda',
    line: 'Esta persona viaja con M-Care. Si algo va mal, pida ayuda ahora.',
    cta: 'Pedir ayuda para esta persona',
    call: 'Llamar al',
    reassure: 'M-Care tiene su solicitud. Están enviando a alguien.',
    askWhere: '¿Dónde está? Esto ayuda al conductor a encontrarla.',
    share: 'Compartir mi ubicación',
    address: 'Escribir la dirección',
    addressPh: 'Calle, edificio, zona',
    send: 'Enviar',
    skip: 'Omitir',
    sent: 'Ubicación enviada.',
    notShared: 'Ubicación no compartida.',
    waiting: 'M-Care está consiguiendo un conductor.',
    assigned: 'Un conductor aceptó y va en camino.',
    arrived: 'Un conductor ya llegó.',
    unresolved: 'M-Care le llamará ahora.',
    held: 'M-Care tiene su solicitud.',
    continues: 'La ayuda continúa esté o no abierta esta página.',
    closed: 'M-Care cerró esta solicitud.',
    invalidTitle: 'Esta tarjeta no está activa',
    invalidNote: 'Llame al número de abajo si alguien necesita ayuda.',
    ref: 'Referencia',
  },
  pt: {
    needsHelp: '{name} pode precisar de ajuda',
    line: 'Esta pessoa está a viajar com a M-Care. Se algo estiver errado, peça ajuda agora.',
    cta: 'Pedir ajuda para esta pessoa',
    call: 'Ligar para',
    reassure: 'A M-Care recebeu o seu pedido. Alguém está a caminho.',
    askWhere: 'Onde está? Isto ajuda o motorista a encontrá-la.',
    share: 'Partilhar a minha localização',
    address: 'Escrever a morada',
    addressPh: 'Rua, edifício, zona',
    send: 'Enviar',
    skip: 'Ignorar',
    sent: 'Localização enviada.',
    notShared: 'Localização não partilhada.',
    waiting: 'A M-Care está a arranjar um motorista.',
    assigned: 'Um motorista aceitou e está a caminho.',
    arrived: 'Um motorista já chegou.',
    unresolved: 'A M-Care vai ligar-lhe agora.',
    held: 'A M-Care tem o seu pedido.',
    continues: 'A ajuda continua, quer esta página fique aberta ou não.',
    closed: 'A M-Care encerrou este pedido.',
    invalidTitle: 'Este cartão não está ativo',
    invalidNote: 'Ligue para o número abaixo se alguém precisar de ajuda.',
    ref: 'Referência',
  },
  fr: {
    needsHelp: '{name} a peut-être besoin d’aide',
    line: 'Cette personne voyage avec M-Care. Si quelque chose ne va pas, demandez de l’aide maintenant.',
    cta: 'Demander de l’aide pour elle',
    call: 'Appeler le',
    reassure: 'M-Care a reçu votre demande. Quelqu’un est envoyé vers elle.',
    askWhere: 'Où est-elle ? Cela aide le chauffeur à la trouver.',
    share: 'Partager ma position',
    address: 'Saisir l’adresse',
    addressPh: 'Rue, bâtiment, quartier',
    send: 'Envoyer',
    skip: 'Ignorer',
    sent: 'Position envoyée.',
    notShared: 'Position non partagée.',
    waiting: 'M-Care cherche un chauffeur.',
    assigned: 'Un chauffeur a accepté et arrive.',
    arrived: 'Un chauffeur est sur place.',
    unresolved: 'M-Care va vous appeler.',
    held: 'M-Care a votre demande.',
    continues: 'L’aide continue, que cette page reste ouverte ou non.',
    closed: 'M-Care a clos cette demande.',
    invalidTitle: 'Cette carte n’est pas active',
    invalidNote: 'Appelez le numéro ci-dessous si quelqu’un a besoin d’aide.',
    ref: 'Référence',
  },
  it: {
    needsHelp: '{name} potrebbe aver bisogno di aiuto',
    line: 'Questa persona viaggia con M-Care. Se qualcosa non va, chieda aiuto subito.',
    cta: 'Chiedi aiuto per questa persona',
    call: 'Chiama il',
    reassure: 'M-Care ha ricevuto la richiesta. Qualcuno sta arrivando.',
    askWhere: 'Dove si trova? Aiuta l’autista a trovarla.',
    share: 'Condividi la mia posizione',
    address: 'Scrivi l’indirizzo',
    addressPh: 'Via, edificio, zona',
    send: 'Invia',
    skip: 'Salta',
    sent: 'Posizione inviata.',
    notShared: 'Posizione non condivisa.',
    waiting: 'M-Care sta cercando un autista.',
    assigned: 'Un autista ha accettato ed è in arrivo.',
    arrived: 'Un autista è arrivato.',
    unresolved: 'M-Care la chiamerà ora.',
    held: 'M-Care ha la sua richiesta.',
    continues: 'L’aiuto continua anche se questa pagina viene chiusa.',
    closed: 'M-Care ha chiuso questa richiesta.',
    invalidTitle: 'Questa tessera non è attiva',
    invalidNote: 'Chiami il numero qui sotto se qualcuno ha bisogno di aiuto.',
    ref: 'Riferimento',
  },
  de: {
    needsHelp: '{name} braucht vielleicht Hilfe',
    line: 'Diese Person reist mit M-Care. Wenn etwas nicht stimmt, holen Sie jetzt Hilfe.',
    cta: 'Hilfe für diese Person holen',
    call: 'Anrufen:',
    reassure: 'M-Care hat Ihre Anfrage. Jemand ist auf dem Weg.',
    askWhere: 'Wo ist die Person? Das hilft dem Fahrer, sie zu finden.',
    share: 'Meinen Standort teilen',
    address: 'Adresse eingeben',
    addressPh: 'Straße, Gebäude, Gegend',
    send: 'Senden',
    skip: 'Überspringen',
    sent: 'Standort gesendet.',
    notShared: 'Standort nicht geteilt.',
    waiting: 'M-Care sucht einen Fahrer.',
    assigned: 'Ein Fahrer hat angenommen und ist unterwegs.',
    arrived: 'Ein Fahrer ist angekommen.',
    unresolved: 'M-Care ruft Sie jetzt an.',
    held: 'M-Care hat Ihre Anfrage.',
    continues: 'Die Hilfe läuft weiter, ob diese Seite offen bleibt oder nicht.',
    closed: 'M-Care hat diese Anfrage geschlossen.',
    invalidTitle: 'Diese Karte ist nicht aktiv',
    invalidNote: 'Rufen Sie die Nummer unten an, wenn jemand Hilfe braucht.',
    ref: 'Referenz',
  },
  tr: {
    needsHelp: '{name} yardıma ihtiyaç duyuyor olabilir',
    line: 'Bu kişi M-Care ile seyahat ediyor. Bir sorun varsa hemen yardım isteyin.',
    cta: 'Onun için yardım iste',
    call: 'Ara:',
    reassure: 'M-Care talebinizi aldı. Ona biri gönderiliyor.',
    askWhere: 'Nerede? Bu, sürücünün onu bulmasına yardımcı olur.',
    share: 'Konumumu paylaş',
    address: 'Adresi yaz',
    addressPh: 'Sokak, bina, bölge',
    send: 'Gönder',
    skip: 'Atla',
    sent: 'Konum gönderildi.',
    notShared: 'Konum paylaşılmadı.',
    waiting: 'M-Care bir sürücü ayarlıyor.',
    assigned: 'Bir sürücü kabul etti ve yolda.',
    arrived: 'Bir sürücü ulaştı.',
    unresolved: 'M-Care sizi şimdi arayacak.',
    held: 'M-Care talebinizi aldı.',
    continues: 'Bu sayfa açık kalsa da kalmasa da yardım devam eder.',
    closed: 'M-Care bu talebi kapattı.',
    invalidTitle: 'Bu kart etkin değil',
    invalidNote: 'Biri yardıma ihtiyaç duyuyorsa aşağıdaki numarayı arayın.',
    ref: 'Referans',
  },
  th: {
    needsHelp: '{name} อาจต้องการความช่วยเหลือ',
    line: 'บุคคลนี้เดินทางกับ M-Care หากมีสิ่งผิดปกติ โปรดขอความช่วยเหลือทันที',
    cta: 'ขอความช่วยเหลือให้บุคคลนี้',
    call: 'โทร',
    reassure: 'M-Care ได้รับคำขอแล้ว กำลังส่งคนไปหา',
    askWhere: 'อยู่ที่ไหน? ช่วยให้คนขับหาเจอ',
    share: 'แชร์ตำแหน่งของฉัน',
    address: 'พิมพ์ที่อยู่',
    addressPh: 'ถนน อาคาร พื้นที่',
    send: 'ส่ง',
    skip: 'ข้าม',
    sent: 'ส่งตำแหน่งแล้ว',
    notShared: 'ไม่ได้แชร์ตำแหน่ง',
    waiting: 'M-Care กำลังจัดหาคนขับ',
    assigned: 'คนขับรับงานและกำลังมา',
    arrived: 'คนขับไปถึงแล้ว',
    unresolved: 'M-Care จะโทรหาคุณ',
    held: 'M-Care ได้รับคำขอของคุณ',
    continues: 'ความช่วยเหลือดำเนินต่อ ไม่ว่าหน้านี้จะเปิดอยู่หรือไม่',
    closed: 'M-Care ปิดคำขอนี้แล้ว',
    invalidTitle: 'บัตรนี้ไม่ทำงาน',
    invalidNote: 'หากมีคนต้องการความช่วยเหลือ โปรดโทรตามหมายเลขด้านล่าง',
    ref: 'อ้างอิง',
  },
  ar: {
    needsHelp: '{name} قد يحتاج إلى مساعدة',
    line: 'هذا الشخص مسافر مع M-Care. إذا كان هناك خطب ما، اطلب المساعدة الآن.',
    cta: 'اطلب المساعدة له',
    call: 'اتصل بـ',
    reassure: 'استلمت M-Care طلبك. يتم إرسال مساعدة الآن.',
    askWhere: 'أين هو؟ هذا يساعد السائق في العثور عليه.',
    share: 'مشاركة موقعي',
    address: 'اكتب العنوان',
    addressPh: 'الشارع، المبنى، المنطقة',
    send: 'إرسال',
    skip: 'تخطٍ',
    sent: 'تم إرسال الموقع.',
    notShared: 'لم يتم مشاركة الموقع.',
    waiting: 'M-Care ترتب سائقًا.',
    assigned: 'وافق سائق وهو في الطريق.',
    arrived: 'وصل سائق.',
    unresolved: 'ستتصل بك M-Care الآن.',
    held: 'M-Care لديها طلبك.',
    continues: 'المساعدة مستمرة سواء بقيت هذه الصفحة مفتوحة أم لا.',
    closed: 'أغلقت M-Care هذا الطلب.',
    invalidTitle: 'هذه البطاقة غير مفعّلة',
    invalidNote: 'اتصل بالرقم أدناه إذا كان أحد يحتاج إلى مساعدة.',
    ref: 'المرجع',
  },
  zh: {
    needsHelp: '{name} 可能需要帮助',
    line: '这位旅客正在使用 M-Care。如有异常，请立即求助。',
    cta: '为他求助',
    call: '拨打',
    reassure: 'M-Care 已收到您的请求，正在派人前往。',
    askWhere: '他/她在哪里？这能帮助司机找到人。',
    share: '共享我的位置',
    address: '输入地址',
    addressPh: '街道、建筑、区域',
    send: '发送',
    skip: '跳过',
    sent: '位置已发送。',
    notShared: '未共享位置。',
    waiting: 'M-Care 正在安排司机。',
    assigned: '司机已接单，正在赶来。',
    arrived: '司机已到达。',
    unresolved: 'M-Care 马上会给您打电话。',
    held: 'M-Care 已收到您的请求。',
    continues: '无论此页面是否保持打开，援助都会继续。',
    closed: 'M-Care 已关闭此请求。',
    invalidTitle: '此卡未启用',
    invalidNote: '如有人需要帮助，请拨打下方电话。',
    ref: '编号',
  },
};

export function cardCopy(lang: string): CardCopy {
  return { ...EN, ...(COPY[lang] || {}) };
}

export function fillName(template: string, name: string): string {
  return String(template || '').replace('{name}', String(name || '').trim() || '—');
}

/** The false-alarm reasons, in the language of the care team and the card. */
export const FALSE_ALARM_REASON_EN: Record<string, string> = {
  traveller_confirmed_well: 'Traveller confirmed safe by phone',
  guardian_confirmed_no_emergency: 'Guardian confirmed no emergency',
  card_misunderstood: 'Card tapped without understanding it',
  accidental_tap: 'Accidental tap by a bystander',
  issue_already_handled: 'Issue already being handled elsewhere',
};