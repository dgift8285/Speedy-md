export const name = 'status';
export const category = 'General';
export const description = 'Auto view and like all WhatsApp statuses';

// Store which bots have status viewing enabled
const statusViewEnabled = new Set();

export function getStatusViewEnabled() {
  return statusViewEnabled;
}

export async function execute({ sock, from, args, sender }) {
  const action = args[0]?.toLowerCase();

  if (!action || (action !== 'on' && action !== 'off')) {
    const enabled = statusViewEnabled.has(sock.user.id);
    return await sock.sendMessage(from, {
      text:
        `👁️ *AutoView Status*\n\n` +
        `Current Status: *${enabled ? '✅ ON' : '❌ OFF'}*\n\n` +
        `Usage:\n` +
        `▸ *.status on* — Enable auto view\n` +
        `▸ *.status off* — Disable auto view\n\n` +
        `_Bot will automatically view and like all statuses!_`
    });
  }

  if (action === 'on') {
    statusViewEnabled.add(sock.user.id);
    await sock.sendMessage(from, {
      text:
        `✅ *AutoView Status Enabled!*\n\n` +
        `👁️ Bot will now automatically:\n` +
        `▸ View all statuses\n` +
        `▸ React with ❤️\n\n` +
        `_Powered by SpeedyMD_ ⚡`
    });
  } else {
    statusViewEnabled.delete(sock.user.id);
    await sock.sendMessage(from, {
      text:
        `❌ *AutoView Status Disabled!*\n\n` +
        `Bot will no longer auto view statuses.`
    });
  }
}