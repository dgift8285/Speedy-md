import { downloadMediaMessage } from '@whiskeysockets/baileys';

export const name = 'btp';
export const category = 'General';
export const description = 'Set bot profile picture';

export async function execute({ sock, msg, from, sender, isGroup }) {
  try {
    // Check if owner only
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const senderJid = isGroup ? msg.key.participant : msg.key.remoteJid;

    if (senderJid !== ownerJid) {
      return await sock.sendMessage(from, {
        text: `❌ *Only owner can change bot profile picture!*`,
      }, { quoted: msg });
    }

    // Check if replying to image
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;

    if (!quotedMsg) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Reply to an image!*\n\n` +
          `How to use:\n` +
          `▸ Send an image\n` +
          `▸ Reply to it\n` +
          `▸ Type *.btp*\n` +
          `▸ Bot profile picture changes! ⚡`,
      }, { quoted: msg });
    }

    // Check if image
    const imageMessage =
      quotedMsg.imageMessage ||
      quotedMsg.viewOnceMessage?.message?.imageMessage ||
      quotedMsg.viewOnceMessageV2?.message?.imageMessage ||
      null;

    if (!imageMessage) {
      return await sock.sendMessage(from, {
        text: `❌ *Please reply to an image!*\n\nOnly images are supported for profile picture.`,
      }, { quoted: msg });
    }

    // React first
    await sock.sendMessage(from, {
      react: { text: '⏳', key: msg.key },
    });

    // Download image
    const buffer = await downloadMediaMessage(
      {
        key: {
          remoteJid: from,
          id: contextInfo.stanzaId,
          fromMe: false,
          participant: contextInfo.participant,
        },
        message: { imageMessage },
      },
      'buffer',
      {},
      {
        logger: {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        },
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    if (!buffer || buffer.length === 0) {
      throw new Error('Could not download image');
    }

    console.log(`🖼️ Downloaded image: ${buffer.length} bytes`);

    // Set profile picture
    await sock.updateProfilePicture(sock.user.id, buffer);

    console.log('✅ Bot profile picture updated!');

    // React with success
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key },
    });

    await sock.sendMessage(from, {
      text: `✅ *Bot profile picture updated!* ⚡\n\n_Powered by SpeedyMD_ 🚀`,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ BTP error:', err.message);

    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key },
    });

    await sock.sendMessage(from, {
      text: `❌ *Failed to update profile picture!*\n\n_${err.message}_\n\nPlease try again!`,
    }, { quoted: msg });
  }
}