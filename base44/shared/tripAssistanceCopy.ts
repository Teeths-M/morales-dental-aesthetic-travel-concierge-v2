/**
 * tripAssistanceCopy — the fixed wording this module is allowed to say.
 *
 * Every sentence here is a template, reviewed once, filled only with tokens
 * from the trip record and the closed form fields. Nothing in this file is
 * generated at runtime and nothing is translated live: the moment a sentence is
 * needed, the network is usually the thing that stopped working. Each template
 * carries the trip language and its English twin, so the review screen can show
 * a traveller exactly what will be said in both.
 */

export type TA_LANG = 'en' | 'es' | 'pt' | 'fr' | 'it' | 'de';

export const SUPPORTED_LANGS: { code: TA_LANG; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
];

export function languageName(code: string): string {
  return SUPPORTED_LANGS.find((l) => l.code === code)?.name || 'English';
}

/** Destination country → the language a local actually speaks. */
export const COUNTRY_LANGUAGE: Record<string, TA_LANG> = {
  venezuela: 'es',
  colombia: 'es',
  mexico: 'es',
  argentina: 'es',
  chile: 'es',
  peru: 'es',
  ecuador: 'es',
  'dominican republic': 'es',
  'costa rica': 'es',
  panama: 'es',
  spain: 'es',
  brazil: 'pt',
  portugal: 'pt',
  france: 'fr',
  belgium: 'fr',
  italy: 'it',
  germany: 'de',
  austria: 'de',
  switzerland: 'de',
  'trinidad and tobago': 'en',
  'united states': 'en',
  'united kingdom': 'en',
};

export function languageForCountry(country: string | undefined): TA_LANG {
  const key = String(country || '').toLowerCase().trim();
  if (!key) return 'en';
  const direct = COUNTRY_LANGUAGE[key];
  if (direct) return direct;
  const partial = Object.keys(COUNTRY_LANGUAGE).find((c) => key.includes(c));
  return partial ? COUNTRY_LANGUAGE[partial] : 'en';
}

/**
 * Destination → the timezone quiet hours run on. Deliberately small and
 * explicit: a wrong zone would silence a call at the wrong hour, so an unknown
 * country falls back to UTC rather than guessing from a prefix.
 */
export const COUNTRY_TIMEZONE: Record<string, string> = {
  venezuela: 'America/Caracas',
  colombia: 'America/Bogota',
  mexico: 'America/Mexico_City',
  argentina: 'America/Argentina/Buenos_Aires',
  chile: 'America/Santiago',
  peru: 'America/Lima',
  ecuador: 'America/Guayaquil',
  'dominican republic': 'America/Santo_Domingo',
  'costa rica': 'America/Costa_Rica',
  panama: 'America/Panama',
  'trinidad and tobago': 'America/Port_of_Spain',
  brazil: 'America/Sao_Paulo',
  portugal: 'Europe/Lisbon',
  spain: 'Europe/Madrid',
  france: 'Europe/Paris',
  belgium: 'Europe/Brussels',
  italy: 'Europe/Rome',
  germany: 'Europe/Berlin',
  austria: 'Europe/Vienna',
  switzerland: 'Europe/Zurich',
};

export function timezoneForCountry(country: string | undefined): string {
  const key = String(country || '').toLowerCase().trim();
  if (COUNTRY_TIMEZONE[key]) return COUNTRY_TIMEZONE[key];
  const partial = Object.keys(COUNTRY_TIMEZONE).find((c) => key.includes(c));
  return partial ? COUNTRY_TIMEZONE[partial] : 'UTC';
}

/** The question that closes every tier-1 script, so an answer is confirmable. */
export const CLOSING_QUESTION: Record<TA_LANG, string> = {
  en: 'Can you confirm that now, please?',
  es: '¿Puede confirmármelo ahora, por favor?',
  pt: 'Pode confirmar-me isso agora, por favor?',
  fr: 'Pouvez-vous me le confirmer maintenant, s’il vous plaît ?',
  it: 'Può confermarmelo adesso, per favore?',
  de: 'Können Sie mir das jetzt bitte bestätigen?',
};

/**
 * Tier-1 sentences. Tokens are limited to first_name, room_number, place_name
 * and procedure_date — all of which the traveller either typed for this request
 * or approved on the standing list. A free-text "detail" field is never a token
 * here: it is context for the human, not words put in a stranger's ear.
 */
export const TIER1_ASK: Record<string, Record<TA_LANG, string>> = {
  front_desk_access: {
    en: 'Hello, this is M-Care calling for {first_name}, a traveller staying in room {room_number}. The room key is not working — could someone from the front desk come up?',
    es: 'Buenas, habla M-Care por {first_name}, un viajero alojado en la habitación {room_number}. La llave no funciona, ¿puede alguien de recepción subir?',
    pt: 'Boa tarde, fala a M-Care por {first_name}, um viajante no quarto {room_number}. A chave não funciona — alguém da receção pode subir?',
    fr: 'Bonjour, ici M-Care, pour {first_name}, un voyageur qui séjourne dans la chambre {room_number}. La clé ne fonctionne pas — quelqu’un de la réception peut-il monter ?',
    it: 'Buongiorno, parla M-Care per {first_name}, un viaggiatore nella camera {room_number}. La chiave non funziona: qualcuno della reception può salire?',
    de: 'Guten Tag, hier spricht M-Care für {first_name}, einen Reisenden in Zimmer {room_number}. Der Zimmerschlüssel funktioniert nicht – kann jemand von der Rezeption kommen?',
  },
  pharmacy_availability: {
    en: 'Hello, is there a pharmacy open right now near {place_name}, and until what time is it open?',
    es: 'Buenas, ¿hay alguna farmacia abierta ahora cerca de {place_name} y hasta qué hora abre?',
    pt: 'Boa tarde, há alguma farmácia aberta agora perto de {place_name} e até que horas está aberta?',
    fr: 'Bonjour, y a-t-il une pharmacie ouverte en ce moment près de {place_name}, et jusqu’à quelle heure ?',
    it: 'Buongiorno, c’è una farmacia aperta adesso vicino a {place_name} e fino a che ora è aperta?',
    de: 'Guten Tag, gibt es in der Nähe von {place_name} eine Apotheke, die jetzt geöffnet ist, und bis wann?',
  },
  opening_hours: {
    en: 'Hello, is {place_name} open today, and what time do you close?',
    es: 'Buenas, ¿{place_name} abre hoy y a qué hora cierran?',
    pt: 'Boa tarde, {place_name} está aberto hoje e a que horas fecham?',
    fr: 'Bonjour, {place_name} est-il ouvert aujourd’hui et à quelle heure fermez-vous ?',
    it: 'Buongiorno, {place_name} è aperto oggi e a che ora chiudete?',
    de: 'Guten Tag, hat {place_name} heute geöffnet und bis wann?',
  },
  appointment_confirm: {
    en: 'Hello, this is M-Care calling for {first_name}. Can you confirm the appointment on {procedure_date} is still scheduled?',
    es: 'Buenas, habla M-Care por {first_name}. ¿Puede confirmar que la cita del {procedure_date} sigue en pie?',
    pt: 'Boa tarde, fala a M-Care por {first_name}. Pode confirmar que a consulta de {procedure_date} continua marcada?',
    fr: 'Bonjour, ici M-Care, pour {first_name}. Pouvez-vous confirmer que le rendez-vous du {procedure_date} est toujours prévu ?',
    it: 'Buongiorno, parla M-Care per {first_name}. Può confermare che l’appuntamento del {procedure_date} è ancora fissato?',
    de: 'Guten Tag, hier spricht M-Care für {first_name}. Können Sie bestätigen, dass der Termin am {procedure_date} weiterhin steht?',
  },
  appointment_change: {
    en: 'Hello, this is M-Care calling for {first_name}. The appointment on {procedure_date} needs to move — what is the next time you have available?',
    es: 'Buenas, habla M-Care por {first_name}. La cita del {procedure_date} debe cambiarse, ¿cuál es el próximo horario disponible?',
    pt: 'Boa tarde, fala a M-Care por {first_name}. A consulta de {procedure_date} tem de ser alterada — qual é a próxima disponibilidade?',
    fr: 'Bonjour, ici M-Care, pour {first_name}. Le rendez-vous du {procedure_date} doit être déplacé — quelle est votre prochaine disponibilité ?',
    it: 'Buongiorno, parla M-Care per {first_name}. L’appuntamento del {procedure_date} va spostato: qual è la prossima disponibilità?',
    de: 'Guten Tag, hier spricht M-Care für {first_name}. Der Termin am {procedure_date} muss verschoben werden – wann wäre es Ihnen möglich?',
  },
  callback_request: {
    en: 'Hello, this is M-Care calling for {first_name}. Could someone call the M-Care number back when you have a moment?',
    es: 'Buenas, habla M-Care por {first_name}. ¿Puede alguien devolver la llamada al número de M-Care cuando tenga un momento?',
    pt: 'Boa tarde, fala a M-Care por {first_name}. Alguém pode devolver a chamada para o número da M-Care quando puder?',
    fr: 'Bonjour, ici M-Care, pour {first_name}. Quelqu’un peut-il rappeler le numéro M-Care dès que possible ?',
    it: 'Buongiorno, parla M-Care per {first_name}. Qualcuno può richiamare il numero M-Care appena possibile?',
    de: 'Guten Tag, hier spricht M-Care für {first_name}. Könnte jemand bei Gelegenheit die M-Care-Nummer zurückrufen?',
  },
};

/**
 * Show-this-screen sentences. Short on purpose: this is read at arm's length by
 * a stranger on a dim screen, so it is one thought, then a number to call.
 */
export const SHOW_CARDS: Record<
  string,
  { label: string; text: Record<TA_LANG, string> }
> = {
  help_needed: {
    label: 'I need help',
    text: {
      en: 'Please help me. I am an M-Care traveller and I cannot speak your language. Please call the number below.',
      es: 'Por favor, ayúdeme. Soy un viajero de M-Care y no hablo su idioma. Llame al número de abajo.',
      pt: 'Por favor, ajude-me. Sou um viajante da M-Care e não falo a sua língua. Ligue para o número abaixo.',
      fr: 'Aidez-moi, s’il vous plaît. Je suis un voyageur M-Care et je ne parle pas votre langue. Appelez le numéro ci-dessous.',
      it: 'Per favore, mi aiuti. Sono un viaggiatore M-Care e non parlo la sua lingua. Chiami il numero qui sotto.',
      de: 'Bitte helfen Sie mir. Ich bin ein M-Care-Reisender und spreche Ihre Sprache nicht. Rufen Sie bitte die Nummer unten an.',
    },
  },
  need_doctor: {
    label: 'I need a doctor',
    text: {
      en: 'I need a doctor. I am an M-Care traveller. Please call the number below.',
      es: 'Necesito un médico. Soy un viajero de M-Care. Llame al número de abajo.',
      pt: 'Preciso de um médico. Sou um viajante da M-Care. Ligue para o número abaixo.',
      fr: 'J’ai besoin d’un médecin. Je suis un voyageur M-Care. Appelez le numéro ci-dessous.',
      it: 'Ho bisogno di un medico. Sono un viaggiatore M-Care. Chiami il numero qui sotto.',
      de: 'Ich brauche einen Arzt. Ich bin ein M-Care-Reisender. Rufen Sie bitte die Nummer unten an.',
    },
  },
  need_ambulance: {
    label: 'I need an ambulance',
    text: {
      en: 'I need an ambulance. Please call one now, then call the number below.',
      es: 'Necesito una ambulancia. Llame a una ahora y después al número de abajo.',
      pt: 'Preciso de uma ambulância. Ligue agora e depois para o número abaixo.',
      fr: 'J’ai besoin d’une ambulance. Appelez-en une maintenant, puis le numéro ci-dessous.',
      it: 'Ho bisogno di un’ambulanza. Ne chiami una subito, poi il numero qui sotto.',
      de: 'Ich brauche einen Krankenwagen. Rufen Sie bitte jetzt einen und danach die Nummer unten an.',
    },
  },
  allergic_to_medicine: {
    label: 'A medicine is causing a reaction',
    text: {
      en: 'I am having a reaction to a medicine I was given. Please call the number below immediately.',
      es: 'Estoy teniendo una reacción a un medicamento que me dieron. Llame al número de abajo inmediatamente.',
      pt: 'Estou a ter uma reação a um medicamento que me deram. Ligue para o número abaixo imediatamente.',
      fr: 'J’ai une réaction à un médicament qu’on m’a donné. Appelez le numéro ci-dessous immédiatement.',
      it: 'Sto avendo una reazione a un farmaco che mi hanno dato. Chiami subito il numero qui sotto.',
      de: 'Ich reagiere auf ein Medikament, das mir gegeben wurde. Rufen Sie bitte sofort die Nummer unten an.',
    },
  },
  being_followed: {
    label: 'Someone is following me',
    text: {
      en: 'Someone is following me. Please help me reach a safe place with staff, and call the number below.',
      es: 'Alguien me está siguiendo. Ayúdeme a llegar a un lugar seguro con personal y llame al número de abajo.',
      pt: 'Alguém está a seguir-me. Ajude-me a chegar a um local seguro com pessoas e ligue para o número abaixo.',
      fr: 'Quelqu’un me suit. Aidez-moi à rejoindre un lieu sûr avec du personnel et appelez le numéro ci-dessous.',
      it: 'Qualcuno mi sta seguendo. Mi aiuti a raggiungere un luogo sicuro con personale e chiami il numero qui sotto.',
      de: 'Jemand folgt mir. Helfen Sie mir bitte zu einem sicheren, besetzten Ort und rufen Sie die Nummer unten an.',
    },
  },
  locked_out_of_room: {
    label: 'I am locked out of my room',
    text: {
      en: 'I cannot get into my room. Please help me, and call the number below.',
      es: 'No puedo entrar en mi habitación. Ayúdeme, por favor, y llame al número de abajo.',
      pt: 'Não consigo entrar no meu quarto. Ajude-me, por favor, e ligue para o número abaixo.',
      fr: 'Je ne peux pas entrer dans ma chambre. Aidez-moi et appelez le numéro ci-dessous.',
      it: 'Non riesco a entrare nella mia camera. Mi aiuti e chiami il numero qui sotto.',
      de: 'Ich komme nicht in mein Zimmer. Bitte helfen Sie mir und rufen Sie die Nummer unten an.',
    },
  },
};

export const SHOW_SITUATIONS = Object.keys(SHOW_CARDS);

/** What a completed tier-1 exchange should have produced. */
export const EXPECTED_ANSWER: Record<string, string> = {
  front_desk_access: 'Yes and someone is on the way, or no and why not.',
  pharmacy_availability: 'An open pharmacy and its closing time.',
  opening_hours: 'Open or closed today, and the closing time.',
  appointment_confirm: 'The appointment is confirmed, or it has moved.',
  appointment_change: 'The next available day and time.',
  callback_request: 'Yes, a callback, and roughly when.',
};

/** Stated on the review screen so the boundary is visible, not assumed. */
export const PROHIBITED_BY_TIER: Record<number, string[]> = {
  1: [
    'Medicine names, doses or prescriptions',
    'Payment details, card numbers or balances',
    'Passport or identity document numbers',
    'Your full medical record or diagnosis',
  ],
  2: [
    'Anything spoken aloud — this tier is written only',
    'Medicine names read out to a third party',
  ],
  3: [
    'Anything scripted or automated — a human speaks',
    'Any disclosure beyond the standing approved list without a recorded reason',
  ],
};

/** The line a traveller reads once an outcome is recorded. */
export function outcomeSummary(opts: {
  language: string;
  categoryLabel: string;
  attempt: string;
  agreement: string;
  nextStep?: string;
}): string {
  const { categoryLabel, attempt, agreement, nextStep } = opts;
  const parts: string[] = [];
  if (attempt === 'connected') parts.push(`We reached them about ${categoryLabel.toLowerCase()}.`);
  else if (attempt === 'no_answer') parts.push(`No answer on the first try for ${categoryLabel.toLowerCase()}.`);
  else if (attempt === 'wrong_department') parts.push(`We were sent to the wrong desk for ${categoryLabel.toLowerCase()}.`);
  else if (attempt === 'dropped') parts.push(`The line dropped during the call about ${categoryLabel.toLowerCase()}.`);
  else if (attempt === 'attempted') parts.push(`Attempted ${categoryLabel.toLowerCase()}, not connected.`);
  else parts.push(`${categoryLabel} — no attempt recorded yet.`);

  if (agreement === 'agreed') parts.push('They said yes to what we asked.');
  else if (agreement === 'partial') parts.push('They agreed to part of it.');
  else if (agreement === 'refused') parts.push('They said no.');
  else if (attempt === 'connected') parts.push('They did not confirm either way.');

  if (nextStep) parts.push(nextStep);
  return parts.join(' ');
}