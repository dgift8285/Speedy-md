import { downloadMediaMessage } from '@whiskeysockets/baileys';

export const name = 'v';
export const category = 'General';
export const description = 'Reveal view once messages';

export async function execute({ sock, msg, from, sender, isGroup }) {
  try {
    // Get quoted message context
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

    if (!contextInfo || !contextInfo.quotedMessage) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Reply to a view once message!*\n\n` +
          `How to use:\n` +
          `▸ Someone sends a 👁️ view once\n` +
          `▸ Reply to it\n` +
          `▸ Type *.v*\n` +
          `▸ Bot reveals it! ⚡`,
      }, { quoted: msg });
    }

    const quotedMsg = contextInfo.quotedMessage;

    console.log('📨 Quoted message keys:', JSON.stringify(Object.keys(quotedMsg)));

    // Detect view once message - check ALL possible keys
    let mediaMessage = null;
    let mediaType = null;

    // Check viewOnceMessage
    if (quotedMsg.viewOnceMessage?.message) {
      const inner = quotedMsg.viewOnceMessage.message;
      if (inner.imageMessage) {
        mediaMessage = inner.imageMessage;
        mediaType = 'image';
      } else if (inner.videoMessage) {
        mediaMessage = inner.videoMessage;
        mediaType = 'video';
      } else if (inner.audioMessage) {
        mediaMessage = inner.audioMessage;
        mediaType = 'audio';
      }
    }

    // Check viewOnceMessageV2
    if (!mediaType && quotedMsg.viewOnceMessageV2?.message) {
      const inner = quotedMsg.viewOnceMessageV2.message;
      if (inner.imageMessage) {
        mediaMessage = inner.imageMessage;
        mediaType = 'image';
      } else if (inner.videoMessage) {
        mediaMessage = inner.videoMessage;
        mediaType = 'video';
      } else if (inner.audioMessage) {
        mediaMessage = inner.audioMessage;
        mediaType = 'audio';
      }
    }

    // Check viewOnceMessageV2Extension
    if (!mediaType && quotedMsg.viewOnceMessageV2Extension?.message) {
      const inner = quotedMsg.viewOnceMessageV2Extension.message;
      if (inner.imageMessage) {
        mediaMessage = inner.imageMessage;
        mediaType = 'image';
      } else if (inner.videoMessage) {
        mediaMessage = inner.videoMessage;
        mediaType = 'video';
      } else if (inner.audioMessage) {
        mediaMessage = inner.audioMessage;
        mediaType = 'audio';
      }
    }

    // Check direct imageMessage/videoMessage
    if (!mediaType && quotedMsg.imageMessage) {
      mediaMessage = quotedMsg.imageMessage;
      mediaType = 'image';
    }

    if (!mediaType && quotedMsg.videoMessage) {
      mediaMessage = quotedMsg.videoMessage;
      mediaType = 'video';
    }

    if (!mediaType && quotedMsg.audioMessage) {
      mediaMessage = quotedMsg.audioMessage;
      mediaType = 'audio';
    }

    console.log(`📨 Media type detected: ${mediaType}`);

    if (!mediaType || !mediaMessage) {
      return await sock.sendMessage(from, {
        text:
          `❌ *Could not detect media!*\n\n` +
          `Make sure you are replying to a\n` +
          `👁️ *view once* image or video.\n\n` +
          `_Try again_ ⚡`,
      }, { quoted: msg });
    }

    // React with ⚡️
    await sock.sendMessage(from, {
      react: {
        text: '⚡️',
        key: msg.key,
      },
    });

    const senderName = msg.pushName || sender?.split('@')[0] || 'Unknown';
    const chatType = isGroup ? '👥 Group' : '👤 Private';
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';

    const caption =
      `⚡️ *View Once Revealed!*\n\n` +
      `👤 *From:* ${senderName}\n` +
      `📍 *Chat:* ${chatType}\n` +
      `📱 *Number:* +${sender?.split('@')[0]}\n\n` +
      `_Revealed by SpeedyMD_ ⚡`;

    // Build message for download
    const msgForDownload = {
      key: {
        remoteJid: from,
        id: contextInfo.stanzaId,
        fromMe: false,
        participant: contextInfo.participant,
      },
      message: {
        [`${mediaType}Message`]: mediaMessage,
      },
    };

    console.log(`📥 Downloading ${mediaType}...`);

    // Download media
    const buffer = await downloadMediaMessage(
      msgForDownload,
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
      throw new Error('Downloaded buffer is empty');
    }

    console.log(`✅ Downloaded ${buffer.length} bytes`);

    // Send in same chat
    if (mediaType === 'image') {
      await sock.sendMessage(from, {
        image: buffer,
        caption: caption,
        mimetype: mediaMessage.mimetype || 'image/jpeg',
      }, { quoted: msg });
    } else if (mediaType === 'video') {
      await sock.sendMessage(from, {
        video: buffer,
        caption: caption,
        mimetype: mediaMessage.mimetype || 'video/mp4',
      }, { quoted: msg });
    } else if (mediaType === 'audio') {
      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: mediaMessage.mimetype || 'audio/mpeg',
        pttAudio: mediaMessage.ptt || false,
      }, { quoted: msg });
    }

    // Send to owner privately
    if (from !== ownerJid) {
      if (mediaType === 'image') {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: caption,
          mimetype: mediaMessage.mimetype || 'image/jpeg',
        });
      } else if (mediaType === 'video') {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: caption,
          mimetype: mediaMessage.mimetype || 'video/mp4',
        });
      } else if (mediaType === 'audio') {
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: mediaMessage.mimetype || 'audio/mpeg',
          pttAudio: mediaMessage.ptt || false,
        });
      }
      console.log(`✅ Sent to owner: ${ownerJid}`);
    }

  } catch (err) {
    console.error('❌ ViewOnce error:', err.message);
    await sock.sendMessage(from, {
      text:
        `❌ *Failed to reveal!*\n\n` +
        `_${err.message}_\n\n` +
        `Please try again!`,
    }, { quoted: msg });
  }
}