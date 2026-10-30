/**
 * mcareChannels — the ONE place that knows how to open M-Care in WhatsApp or
 * Telegram on this platform.
 *
 * Both the Settings card and the dashboard card link into the same native
 * Base44 agent-connect flow (getWhatsAppConnectURL / getTelegramConnectURL on
 * the already-live `m_care` agent). Before this file existed both call sites
 * built those URLs themselves, which meant one of them could quietly drift
 * (a different agent name, a different window flag) without the other
 * noticing. Pure + one thin opener — no React.
 */
import { base44 } from '@/api/base44Client';

/** The live agent both channels connect to. Kept in one constant. */
export const MCARE_AGENT_NAME = 'm_care';

/** The channels M-Care can be reached on, in the order we show them. */
export const MCARE_CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telegram', label: 'Telegram' },
];

/**
 * Builds the connect URL for one channel. Synchronous by design — these are
 * pure URL builders in the SDK, so no loading state is ever needed.
 *
 * @param {'whatsapp'|'telegram'} channel
 * @returns {string}
 */
export function buildChannelConnectUrl(channel) {
  return channel === 'whatsapp'
    ? base44.agents.getWhatsAppConnectURL(MCARE_AGENT_NAME)
    : base44.agents.getTelegramConnectURL(MCARE_AGENT_NAME);
}

/**
 * Opens a channel's connect flow in a new tab. Throws if the URL can't be
 * built or the tab is blocked, so each caller shows its own message.
 *
 * @param {'whatsapp'|'telegram'} channel
 */
export function openChannelConnect(channel) {
  const url = buildChannelConnectUrl(channel);
  if (!url) throw new Error(`No ${channel} connect URL available.`);
  window.open(url, '_blank', 'noopener,noreferrer');
}