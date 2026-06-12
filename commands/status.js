export const name = 'status';
export const category = 'General';
export const description = 'Auto view and like all WhatsApp statuses';

export const statusViewEnabled = new Set();

export function getStatusViewEnabled() {
  return statusViewEnabled;
}

export async function execute({ sock, from, args }) {
  const action = args[0]?.toLowerCase();

  if (!action || (action !== 'on' && action !== 'off')) {
    const enabled = statusViewEnabled.has(sock.user?.id);
    return await sock.sendMessage(from, {
      text:
        `👁️ *AutoView Status*\n\n` +
        `Status: *${enabled ? '✅ ON' : '❌ OFF'}*\n\n` +
        `Usage:\n` +
        `▸ *.status on* — Enable\n` +
        `▸ *.status off* — Disable\n\n` +
        `_Bot will auto view and react to all statuses!_ ⚡`
    });
  }

  if (action === 'on') {
    statusViewEnabled.add(sock.user?.id);
    await sock.sendMessage(from, {
      text:
        `✅ *AutoView Status Enabled!*\n\n` +
        `👁️ Bot will now:\n` +
        `▸ View all statuses automatically\n` +
        `▸ React with ❤️\n\n` +
        `_Powered by SpeedyMD_ ⚡`
    });
  } else {
    statusViewEnabled.delete(sock.user?.id);
    await sock.sendMessage(from, {
      text:
        `❌ *AutoView Status Disabled!*\n\n` +
        `Bot will no longer auto view statuses.`
    });
  }
}