import { getSet, saveSet } from '../lib/state.js';

export const name = 'status';
export const category = 'General';
export const description = 'Auto view and like all WhatsApp statuses';

export function getStatusViewEnabled() {
  return getSet('statusViewEnabled');
}

export async function execute({ sock, from, args }) {
  const action = args[0]?.toLowerCase();
  const statusViewEnabled = getSet('statusViewEnabled');
  const botId = sock.user?.id || 'default';

  if (!action || (action !== 'on' && action !== 'off')) {
    const enabled = statusViewEnabled.has(botId);
    return await sock.sendMessage(from, {
      text:
        `👁️ *AutoView Status*\n\n` +
        `Status: *${enabled ? '✅ ON' : '❌ OFF'}*\n\n` +
        `▸ *.status on* — Enable\n` +
        `▸ *.status off* — Disable\n\n` +
        `_Bot will auto view and react to all statuses!_ ⚡`
    });
  }

  if (action === 'on') {
    statusViewEnabled.add(botId);
    saveSet('statusViewEnabled', statusViewEnabled);
    await sock.sendMessage(from, {
      text:
        `✅ *AutoView Status Enabled!*\n\n` +
        `👁️ Bot will now:\n` +
        `▸ View all statuses\n` +
        `▸ React with ❤️\n\n` +
        `_Powered by SpeedyMD_ ⚡`
    });
  } else {
    statusViewEnabled.delete(botId);
    saveSet('statusViewEnabled', statusViewEnabled);
    await sock.sendMessage(from, {
      text: `❌ *AutoView Status Disabled!*`
    });
  }
}