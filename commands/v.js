export const name = 'v';
export const category = 'General';
export const description = 'Reveal view once messages';

export async function execute({ sock, msg, from, sender, isGroup }) {
  try {
    // Check if replying to a message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedKey = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted || !quotedKey) {
      return await sock.sendMessage(from, {
        text: `❌ *Reply to a view once message!*\n\nHow to use:\n▸ Reply to any view once message\n▸ Type *.v*\n▸ Bot reveals it! ⚡`,
      }, { quoted: msg });
    }

    // Get view once message
    const viewOnceMessage =
      quoted?.viewOnceMessage?.message ||
      quoted?.viewOnceMessageV2?.message ||
      quoted?.viewOnceMessageV2Extension?.message ||
      quoted?.imageMessage ||
      quoted?.videoMessage ||
      quoted?.audioMessage ||
      null;

    if (!viewOnceMessage) {
      return await sock.sendMessage(from, {
        text: `❌ *That is not a view once message!*\n\nPlease reply to a 👁️ view once message.`,
      }, { quoted: msg });
    }

    // Get media type
    const mediaType =
      viewOnceMessage.imageMessage ? 'image' :
      viewOnceMessage.videoMessage ? 'video' :
      viewOnceMessage.audioMessage ? 'audio' :
      null;

    if (!mediaType) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not detect media type!*\n\nOnly images, videos and audio supported.`,
      }, { quoted: msg });
    }

    const mediaMessage = viewOnceMessage[`${mediaType}Message`];

    // React with ⚡️ first
    await sock.sendMessage(from, {
      react: {
        text: '⚡️',
        key: msg.key,
      },
    });

    // Forward media to owner
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';

    // Build caption
    const senderName = msg.pushName || sender?.split('@')[0] || 'Unknown';
    const chatType = isGroup ? '👥 Group' : '👤 Private';
    const caption =
      `⚡️ *View Once Revealed!*\n\n` +
      `👤 *From:* ${senderName}\n` +
      `📍 *Chat:* ${chatType}\n` +
      `📱 *Number:* +${sender?.split('@')[0]}\n\n` +
      `_Revealed by SpeedyMD_ ⚡`;

    // Download and send media
    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');

      const buffer = await downloadMediaMessage(
        {
          key: quotedKey.stanzaId ? {
            remoteJid: from,
            id: quotedKey.stanzaId,
            fromMe: quotedKey.participant === sock.user?.id,
            participant: quotedKey.participant,
          } : msg.key,
          message: {
            [`${mediaType}Message`]: mediaMessage,
          },
        },
        'buffer',
        {},
        {
          logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      if (!buffer || buffer.length === 0) {
        throw new Error('Empty buffer');
      }

      // Send to owner
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
          caption: caption,
          mimetype: mediaMessage.mimetype || 'audio/mpeg',
          pttAudio: mediaMessage.ptt || false,
        });
      }

      // Also send in same chat
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

      console.log(`✅ View once revealed: ${mediaType} from ${sender}`);

    } catch (downloadErr) {
      console.error('❌ Download error:', downloadErr.message);

      // Fallback: send media info
      await sock.sendMessage(from, {
        text:
          `⚡️ *View Once Detected!*\n\n` +
          `👤 *From:* ${senderName}\n` +
          `📍 *Type:* ${mediaType}\n` +
          `⚠️ *Could not download media*\n\n` +
          `_Try again or ask them to resend_ ⚡`,
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('❌ ViewOnce error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Error revealing view once!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}