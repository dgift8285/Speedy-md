export const name = 't';
export const category = 'Group';
export const description = 'Tag all members in a group';

export async function execute({ sock, msg, from, args, isGroup, isBotAdmin, isAdmin, groupMetadata }) {
  try {
    // Only works in groups
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: `❌ *This command only works in groups!*`,
      }, { quoted: msg });
    }

    // Check if admin
    if (!isAdmin && !isBotAdmin) {
      return await sock.sendMessage(from, {
        text: `❌ *Only admins can use this command!*`,
      }, { quoted: msg });
    }

    const participants = groupMetadata?.participants || [];

    if (participants.length === 0) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not get group members!*`,
      }, { quoted: msg });
    }

    // Custom message or default
    const customMsg = args.join(' ') || '👋 Attention everyone!';

    // Build mentions
    const mentions = participants.map(p => p.id);

    // Build tag text
    let tagText = `╔═══════════════════╗\n`;
    tagText += `║  ⚡ *TAG ALL* ⚡   ║\n`;
    tagText += `╚═══════════════════╝\n\n`;
    tagText += `📢 *${customMsg}*\n\n`;
    tagText += `👥 *Members: ${participants.length}*\n\n`;

    participants.forEach((p, i) => {
      tagText += `▸ @${p.id.split('@')[0]}\n`;
    });

    tagText += `\n_Powered by SpeedyMD_ ⚡`;

    await sock.sendMessage(from, {
      text: tagText,
      mentions: mentions,
    }, { quoted: msg });

    console.log(`✅ Tagged ${participants.length} members in ${from}`);

  } catch (err) {
    console.error('❌ TagAll error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Tag all failed!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}