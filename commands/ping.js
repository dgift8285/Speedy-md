export const name = 'ping';
export const category = 'General';
export const description = 'Check if bot is online';

export async function execute({ sock, from }) {
  const start = Date.now();
  await sock.sendMessage(from, { text: '🏓 Pinging...' });
  const end = Date.now();
  await sock.sendMessage(from, {
    text: `✅ *Pong!*\n⚡ Speed: ${end - start}ms\n🤖 ${process.env.BOT_NAME || 'SpeedyMD'} is online!`
  });
}
