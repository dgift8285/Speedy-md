export const name = 'kck';
export const category = 'Group';
export const description = 'Kick a member from the group';

export async function execute({ sock, msg, from, args, isGroup, isBotAdmin, isAdmin, groupMetadata }) {
  try {
    // Only works in groups
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: `❌ *This command only works in groups!*`,
      }, { quoted: msg });
    }

    // Check if sender is admin
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: `❌ *Only admins can kick members!*`,
      }, { quoted: msg });
    }

    // Check if bot is admin
    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: `❌ *Bot must be admin to kick members!*\n\nPlease make bot admin first.`,
      }, { quoted: msg });
    }

    // Get target from reply or mention
    let target = null;

    // Check if replying to a message
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.participant) {
      target = contextInfo.participant;
    }

    // Check mentions
    if (!target && contextInfo?.mentionedJid?.[0]) {
      target = contextInfo.mentionedJid[0];
    }

    // Check args for number
    if (!target && args[0]) {
      const num = args[0].replace(/[^0-9]/g, '');
      if (num) target = num + '@s.whatsapp.net';
    }

    if (!target) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Please specify who to kick!*\n\n` +
          `How to use:\n` +
          `▸ Reply to their message + *.kck*\n` +
          `▸ Mention them: *.kck @member*\n` +
          `▸ Use number: *.kck 254xxxxxxx*`,
      }, { quoted: msg });
    }

    // Can't kick yourself
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    if (target === botJid) {
      return await sock.sendMessage(from, {
        text: `❌ *I cannot kick myself!*`,
      }, { quoted: msg });
    }

    // Check if target is admin
    const targetParticipant = groupMetadata?.participants?.find(
      p => p.id === target
    );

    if (targetParticipant?.admin) {
      return await sock.sendMessage(from, {
        text: `❌ *Cannot kick an admin!*\n\nDemote them first then kick.`,
      }, { quoted: msg });
    }

    // Get target name
    const targetName = target.split('@')[0];

    // Kick member
    await sock.groupParticipantsUpdate(from, [target], 'remove');

    console.log(`✅ Kicked ${target} from ${from}`);

    await sock.sendMessage(from, {
      text:
        `✅ *Member Kicked!*\n\n` +
        `👤 *Number:* +${targetName}\n` +
        `👊 *Action:* Removed from group\n\n` +
        `_Powered by SpeedyMD_ ⚡`,
      mentions: [target],
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Kick error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Kick failed!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}