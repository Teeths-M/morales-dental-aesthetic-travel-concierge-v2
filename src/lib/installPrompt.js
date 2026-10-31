/**
 * installPrompt — keeps Chrome's "install this app" offer so a page can show a
 * real one-tap "Save M-Care to your phone" button.
 *
 * Chrome fires `beforeinstallprompt` once, early, often before a lazily loaded
 * page has mounted, so this listener is registered from main.jsx at startup and
 * holds the event until a page asks for it. iPhone Safari never fires it (there
 * the page shows the Share > Add to Home Screen steps instead), and it doesn't
 * fire at all once M-Care is already installed.
 */

let deferred = null;
const listeners = new Set();

export function initInstallPrompt() {
	if (typeof window === 'undefined') return;
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferred = e;
		listeners.forEach((fn) => fn(true));
	});
	window.addEventListener('appinstalled', () => {
		deferred = null;
		listeners.forEach((fn) => fn(false));
	});
}

export const canPromptInstall = () => !!deferred;

/** Calls fn(true/false) whenever the offer becomes available or goes away. Returns an unsubscribe. */
export function onInstallAvailability(fn) {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}

/** Shows Chrome's own install dialog. Resolves true if they installed. */
export async function promptInstall() {
	if (!deferred) return false;
	const e = deferred;
	deferred = null;
	listeners.forEach((fn) => fn(false));
	try {
		await e.prompt();
		const choice = await e.userChoice;
		return choice?.outcome === 'accepted';
	} catch {
		return false;
	}
}

/** True when M-Care is already running as an installed app. */
export const isInstalledApp = () =>
	typeof window !== 'undefined' &&
	(window.matchMedia?.('(display-mode: standalone)').matches || /** @type {any} */ (window.navigator).standalone === true);
