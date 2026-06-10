export const name = 'owner';
export const category = 'General';
export const description = 'Shows owner contact';

export async function execute({ sock, from }) {
  await sock.sendMessage(from, {
    text: `👑 *Bot Owner*\n\n📱 Number: +${process.env.OWNER_NUMBER}\n🤖 Bot: ${process.env.BOT_NAME || 'SpeedyMD'}\n\n_Powered by SwiftBot Tec_ 🚀`
  });
}
