/**
 * Pilot sign-up inside the real M-Care chat. Someone scans an ad's QR code
 * (/?mcare=pilot&src=ad29), the chat opens, and M-Care speaks first: it's in
 * building mode, drop your email and phone and it'll add you to the list.
 *
 * The capture is scripted, not the AI: the reply is read here, saved through
 * joinPilot, and answered with a fixed line, so it's instant and can never be
 * misheard or made up. Anything that isn't contact details still goes to the
 * real M-Care agent as normal chat.
 */

export const PILOT_CHAT_GREETING =
	"Hey, thanks for scanning! I'm M-Care. I'm in building mode right now, getting ready to protect you on your next trip. " +
	"Drop your email and phone number here and I'll add you to the pilot list. I'll only use them to tell you about the pilot.";

export const PILOT_CHAT_SAVED =
	"Nice, you're saved! As soon as I'm ready, I'm yours. Take care for now. Safety shouldn't stop at the border.";

export const PILOT_CHAT_NEED_EMAIL = "Got your number. What's your email? I need it to add you to the list.";

export const PILOT_CHAT_FAILED = "That didn't save on my side. Could you send your email again?";

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/;
// A run of digits with the usual separators, optionally starting with +. Counted as a phone number only if it
// holds 7 to 15 digits (the international maximum), so a year or a short code isn't mistaken for one.
const PHONE_RE = /\+?\d[\d\s().-]{5,22}\d/g;

/**
 * Finds an email and a phone number in what someone typed.
 * @param {string} text
 * @returns {{ email: string, phone: string }} empty strings when not found
 */
export function extractPilotContact(text) {
	const raw = String(text || '');
	const emailMatch = raw.match(EMAIL_RE);
	const email = emailMatch ? emailMatch[0].toLowerCase() : '';
	// Look for the phone number outside the email, so digits inside an address never count.
	const rest = emailMatch ? raw.replace(emailMatch[0], ' ') : raw;
	let phone = '';
	for (const m of rest.match(PHONE_RE) || []) {
		const digits = m.replace(/\D/g, '');
		if (digits.length >= 7 && digits.length <= 15) {
			phone = (m.trim().startsWith('+') ? '+' : '') + digits;
			break;
		}
	}
	return { email, phone };
}

/** Keeps only a short plain ad/card tag (ad29, card, post), the same rule joinPilot applies. */
export const cleanCampaignTag = (s) => {
	const v = String(s || '').trim().toLowerCase();
	return /^[a-z0-9_-]{1,40}$/.test(v) ? v : '';
};
