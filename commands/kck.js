export const name = 'kck';
export const category = 'Group';
export const description = 'Kick a member from the group';

export async function execute({ sock, msg, from, args, isGroup, isBotAdmin, isAdmin, groupMetadata, sender }) {
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
        text:
          `❌ *Bot must be admin to kick!*\n\n` +
          `Please make me admin first.`,
      }, { quoted: msg });
    }

    // Get target member
    let target = null;

    // Method 1: Reply to message
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.participant) {
      target = contextInfo.participant;
    }

    // Method 2: Mention
    if (!target && contextInfo?.mentionedJid?.length > 0) {
      target = contextInfo.mentionedJid[0];
    }

    // Method 3: Number in args
    if (!target && args[0]) {
      const num = args[0].replace(/[^0-9]/g, '');
      if (num.length > 5) {
        target = num + '@s.whatsapp.net';
      }
    }

    if (!target) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Please specify who to kick!*\n\n` +
          `How to use:\n` +
          `▸ Reply to their message + *.kck*\n` +
          `▸ *.kck @member*\n` +
          `▸ *.kck 254xxxxxxx*`,
      }, { quoted: msg });
    }

    // Fix target JID format
    if (!target.includes('@')) {
      target = target + '@s.whatsapp.net';
    }

    // Can't kick yourself
    const senderClean = sender?.split('@')[0] + '@s.whatsapp.net';
    if (target === senderClean) {
      return await sock.sendMessage(from, {
        text: `❌ *You cannot kick yourself!*`,
      }, { quoted: msg });
    }

    // Can't kick bot
    const botJid = sock.user.id.includes(':')
      ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
      : sock.user.id;

    if (target === botJid) {
      return await sock.sendMessage(from, {
        text: `❌ *I cannot kick myself!*`,
      }, { quoted: msg });
    }

    // Check if target is admin
    const targetParticipant = groupMetadata?.participants?.find(p => {
      const pid = p.id.includes(':')
        ? p.id.split(':')[0] + '@s.whatsapp.net'
        : p.id;
      return pid === target;
    });

    if (targetParticipant?.admin) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Cannot kick an admin!*\n\n` +
          `Demote them first then kick.`,
      }, { quoted: msg });
    }

    // Check if target is in group
    if (!targetParticipant) {
      return await sock.sendMessage(from, {
        text: `❌ *That person is not in this group!*`,
      }, { quoted: msg });
    }

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