import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const name = 'btp';
export const category = 'General';
export const description = 'Set bot profile picture';

export async function execute({ sock, msg, from, sender, isGroup }) {
  try {
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
        text: `❌ *Please reply to an image!*`,
      }, { quoted: msg });
    }

    // React loading
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

    console.log(`🖼️ Downloaded: ${buffer.length} bytes`);

    // Save as btp_image.jpg for menu
    const btpPath = join(__dirname, '../btp_image.jpg');
    fs.writeFileSync(btpPath, buffer);
    console.log('💾 Saved btp_image.jpg');

    // Set bot profile picture on WhatsApp
    try {
      await sock.updateProfilePicture(sock.user.id, buffer);
      console.log('✅ WhatsApp profile picture updated!');
    } catch (err) {
      console.log('⚠️ Could not update WhatsApp pic:', err.message);
    }

    // React success
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key },
    });

    await sock.sendMessage(from, {
      text:
        `✅ *Bot profile picture updated!*\n\n` +
        `🖼️ New picture will show in *.menu*\n\n` +
        `_Powered by SpeedyMD_ ⚡`,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ BTP error:', err.message);

    await sock.sendMessage(from, {
      react: { text: '❌', key: msg.key },
    });

    await sock.sendMessage(from, {
      text: `❌ *Failed!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}