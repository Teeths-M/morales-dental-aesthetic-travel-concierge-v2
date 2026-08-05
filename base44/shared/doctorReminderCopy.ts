// ── Doctor reminder copy — static, deterministic, no LLM ───────────────────
// Fixed, known-in-advance content for the two doctor-facing reminder emails/
// SMS/WhatsApp/push nudges (checkPartnerSLABreaches's 12h pre-backup nudge,
// detectFallbackCrisis's 24h pre-procedure nudge). Kept as a small backend
// table, separate from src/locales/*/translation.json (those are large,
// patient/marketing-facing dictionaries the frontend consumes — the wrong
// place for six short backend strings).
//
// Language set matches src/i18n.js's SUPPORTED_LANGUAGES exactly (en, es,
// pt, fr, de, it, tr, th, zh) so the doctor-facing language list stays
// consistent with what the app already offers patients — not a new list
// invented for this feature. Arabic is excluded there for a documented RTL
// layout reason unrelated to this file, so it's excluded here too.
//
// Every string here is generic/link-only by design (no patient name, no
// date/time, no amounts) — the real detail lives behind the verified portal
// link, never in the raw notification text, matching shared/notify.ts's
// link-only rule for every other sender in this codebase.

export type DoctorReminderFlavor = 'case_waiting' | 'confirm_date';

export const DOCTOR_REMINDER_FLAVORS: DoctorReminderFlavor[] = ['case_waiting', 'confirm_date'];
export const DOCTOR_REMINDER_LANGS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'tr', 'th', 'zh'] as const;

export interface DoctorReminderCopy {
  emailTitle: string;
  emailLine: string;
  emailCta: string;
  smsLine: string;
  pushTitle: string;
  pushBody: string;
}

const COPY: Record<DoctorReminderFlavor, Record<string, DoctorReminderCopy>> = {
  case_waiting: {
    en: {
      emailTitle: 'A case is waiting on your response.',
      emailLine: "Please open your portal to accept or decline. If we don't hear back soon, we'll need to offer it to another doctor.",
      emailCta: 'Open My Portal',
      smsLine: 'A case is waiting on your response — please open your portal soon.',
      pushTitle: 'Action needed',
      pushBody: 'A case is waiting on your response.',
    },
    es: {
      emailTitle: 'Hay un caso esperando su respuesta.',
      emailLine: 'Por favor, abra su portal para aceptar o rechazar. Si no tenemos noticias suyas pronto, tendremos que ofrecérselo a otro médico.',
      emailCta: 'Abrir mi portal',
      smsLine: 'Hay un caso esperando su respuesta — por favor, abra su portal pronto.',
      pushTitle: 'Acción requerida',
      pushBody: 'Hay un caso esperando su respuesta.',
    },
    pt: {
      emailTitle: 'Há um caso aguardando sua resposta.',
      emailLine: 'Por favor, abra seu portal para aceitar ou recusar. Se não tivermos retorno em breve, precisaremos oferecê-lo a outro médico.',
      emailCta: 'Abrir meu portal',
      smsLine: 'Há um caso aguardando sua resposta — por favor, abra seu portal em breve.',
      pushTitle: 'Ação necessária',
      pushBody: 'Há um caso aguardando sua resposta.',
    },
    fr: {
      emailTitle: 'Un dossier attend votre réponse.',
      emailLine: "Veuillez ouvrir votre portail pour accepter ou refuser. Si nous n'avons pas de nouvelles bientôt, nous devrons le proposer à un autre médecin.",
      emailCta: 'Ouvrir mon portail',
      smsLine: 'Un dossier attend votre réponse — veuillez ouvrir votre portail bientôt.',
      pushTitle: 'Action requise',
      pushBody: 'Un dossier attend votre réponse.',
    },
    de: {
      emailTitle: 'Ein Fall wartet auf Ihre Antwort.',
      emailLine: 'Bitte öffnen Sie Ihr Portal, um anzunehmen oder abzulehnen. Wenn wir nicht bald von Ihnen hören, müssen wir den Fall einem anderen Arzt anbieten.',
      emailCta: 'Mein Portal öffnen',
      smsLine: 'Ein Fall wartet auf Ihre Antwort — bitte öffnen Sie bald Ihr Portal.',
      pushTitle: 'Handlung erforderlich',
      pushBody: 'Ein Fall wartet auf Ihre Antwort.',
    },
    it: {
      emailTitle: 'Un caso è in attesa di una sua risposta.',
      emailLine: 'La preghiamo di aprire il suo portale per accettare o rifiutare. Se non riceveremo risposta presto, dovremo offrirlo a un altro medico.',
      emailCta: 'Apri il mio portale',
      smsLine: 'Un caso è in attesa di una sua risposta — la preghiamo di aprire presto il suo portale.',
      pushTitle: 'Azione richiesta',
      pushBody: 'Un caso è in attesa di una sua risposta.',
    },
    tr: {
      emailTitle: 'Bir vaka yanıtınızı bekliyor.',
      emailLine: 'Lütfen kabul etmek veya reddetmek için portalınızı açın. Yakında sizden haber alamazsak, vakayı başka bir doktora sunmamız gerekecek.',
      emailCta: 'Portalımı Aç',
      smsLine: 'Bir vaka yanıtınızı bekliyor — lütfen yakında portalınızı açın.',
      pushTitle: 'Eylem gerekli',
      pushBody: 'Bir vaka yanıtınızı bekliyor.',
    },
    th: {
      emailTitle: 'มีเคสหนึ่งกำลังรอการตอบกลับจากคุณ',
      emailLine: 'กรุณาเปิดพอร์ทัลของคุณเพื่อรับหรือปฏิเสธเคสนี้ หากเราไม่ได้รับการตอบกลับในเร็ว ๆ นี้ เราจะต้องเสนอเคสนี้ให้แพทย์ท่านอื่น',
      emailCta: 'เปิดพอร์ทัลของฉัน',
      smsLine: 'มีเคสหนึ่งกำลังรอการตอบกลับจากคุณ — กรุณาเปิดพอร์ทัลของคุณเร็ว ๆ นี้',
      pushTitle: 'ต้องดำเนินการ',
      pushBody: 'มีเคสหนึ่งกำลังรอการตอบกลับจากคุณ',
    },
    zh: {
      emailTitle: '有一个病例正在等待您的回复。',
      emailLine: '请打开您的门户网站以接受或拒绝该病例。如果我们近期未收到您的回复,将需要把该病例转给其他医生。',
      emailCta: '打开我的门户网站',
      smsLine: '有一个病例正在等待您的回复——请尽快打开您的门户网站。',
      pushTitle: '需要处理',
      pushBody: '有一个病例正在等待您的回复。',
    },
  },
  confirm_date: {
    en: {
      emailTitle: 'Please confirm your procedure date.',
      emailLine: 'A procedure date on your calendar needs your confirmation. Please open your portal to confirm it is still on.',
      emailCta: 'Open My Portal',
      smsLine: 'Please confirm your upcoming procedure date in your portal.',
      pushTitle: 'Confirmation needed',
      pushBody: 'Please confirm your procedure date.',
    },
    es: {
      emailTitle: 'Por favor, confirme la fecha de su procedimiento.',
      emailLine: 'Una fecha de procedimiento en su calendario necesita su confirmación. Por favor, abra su portal para confirmar que sigue vigente.',
      emailCta: 'Abrir mi portal',
      smsLine: 'Por favor, confirme la fecha de su próximo procedimiento en su portal.',
      pushTitle: 'Confirmación requerida',
      pushBody: 'Por favor, confirme la fecha de su procedimiento.',
    },
    pt: {
      emailTitle: 'Por favor, confirme a data do seu procedimento.',
      emailLine: 'Uma data de procedimento em sua agenda precisa da sua confirmação. Por favor, abra seu portal para confirmar que ainda está mantida.',
      emailCta: 'Abrir meu portal',
      smsLine: 'Por favor, confirme a data do seu próximo procedimento no seu portal.',
      pushTitle: 'Confirmação necessária',
      pushBody: 'Por favor, confirme a data do seu procedimento.',
    },
    fr: {
      emailTitle: 'Veuillez confirmer la date de votre intervention.',
      emailLine: "Une date d'intervention dans votre calendrier nécessite votre confirmation. Veuillez ouvrir votre portail pour confirmer qu'elle est toujours prévue.",
      emailCta: 'Ouvrir mon portail',
      smsLine: 'Veuillez confirmer la date de votre prochaine intervention dans votre portail.',
      pushTitle: 'Confirmation requise',
      pushBody: 'Veuillez confirmer la date de votre intervention.',
    },
    de: {
      emailTitle: 'Bitte bestätigen Sie Ihren Eingriffstermin.',
      emailLine: 'Ein Eingriffstermin in Ihrem Kalender benötigt Ihre Bestätigung. Bitte öffnen Sie Ihr Portal, um zu bestätigen, dass er weiterhin stattfindet.',
      emailCta: 'Mein Portal öffnen',
      smsLine: 'Bitte bestätigen Sie Ihren bevorstehenden Eingriffstermin in Ihrem Portal.',
      pushTitle: 'Bestätigung erforderlich',
      pushBody: 'Bitte bestätigen Sie Ihren Eingriffstermin.',
    },
    it: {
      emailTitle: 'La preghiamo di confermare la data del suo intervento.',
      emailLine: 'Una data di intervento nel suo calendario richiede la sua conferma. La preghiamo di aprire il suo portale per confermare che è ancora prevista.',
      emailCta: 'Apri il mio portale',
      smsLine: 'La preghiamo di confermare la data del suo prossimo intervento nel suo portale.',
      pushTitle: 'Conferma richiesta',
      pushBody: 'La preghiamo di confermare la data del suo intervento.',
    },
    tr: {
      emailTitle: 'Lütfen işlem tarihinizi onaylayın.',
      emailLine: 'Takviminizdeki bir işlem tarihi onayınızı bekliyor. Hâlâ geçerli olduğunu onaylamak için lütfen portalınızı açın.',
      emailCta: 'Portalımı Aç',
      smsLine: 'Lütfen yaklaşan işlem tarihinizi portalınızda onaylayın.',
      pushTitle: 'Onay gerekli',
      pushBody: 'Lütfen işlem tarihinizi onaylayın.',
    },
    th: {
      emailTitle: 'กรุณายืนยันวันที่ทำหัตถการของคุณ',
      emailLine: 'วันที่ทำหัตถการในปฏิทินของคุณต้องได้รับการยืนยัน กรุณาเปิดพอร์ทัลของคุณเพื่อยืนยันว่ายังคงกำหนดการเดิม',
      emailCta: 'เปิดพอร์ทัลของฉัน',
      smsLine: 'กรุณายืนยันวันที่ทำหัตถการที่จะถึงนี้ในพอร์ทัลของคุณ',
      pushTitle: 'ต้องยืนยัน',
      pushBody: 'กรุณายืนยันวันที่ทำหัตถการของคุณ',
    },
    zh: {
      emailTitle: '请确认您的手术日期。',
      emailLine: '您日历中的一个手术日期需要您确认。请打开您的门户网站以确认该日期仍然有效。',
      emailCta: '打开我的门户网站',
      smsLine: '请在您的门户网站中确认即将进行的手术日期。',
      pushTitle: '需要确认',
      pushBody: '请确认您的手术日期。',
    },
  },
};

/** Falls back to English for any missing/unmapped language — never throws. */
export function getDoctorReminderCopy(flavor: DoctorReminderFlavor, lang?: string | null): DoctorReminderCopy {
  const table = COPY[flavor];
  return (lang && table[lang]) || table.en;
}
