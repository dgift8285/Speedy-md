export const name = 'alive';
export const category = 'General';
export const description = 'Shows bot status';

export async function execute({ sock, from }) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  await sock.sendMessage(from, {
    text: `╔═══════════════════════╗\n` +
          `║    ⚡ *SpeedyMD*      ║\n` +
          `╚═══════════════════════╝\n\n` +
          `✅ *Bot is Alive!*\n\n` +
          `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
          `🤖 *Bot:* ${process.env.BOT_NAME || 'SpeedyMD'}\n` +
          `👑 *Owner:* +${process.env.OWNER_NUMBER}\n` +
          `⚡ *Prefix:* ${process.env.PREFIX || '.'}\n\n` +
          `📢 *Channel:*\nhttps://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G\n\n` +
          `_Powered by SwiftBot Tec_ 🚀`
  });
            }
