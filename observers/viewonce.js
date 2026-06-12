export default async function viewOnceObserver(sock, msg, { from, isGroup }) {
  try {
    // Check if message has view once
    const viewOnceMsg =
      msg.message?.viewOnceMessage?.message ||
      msg.message?.viewOnceMessageV2?.message ||
      msg.message?.viewOnceMessageV2Extension?.message ||
      null;

    if (!viewOnceMsg) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || sender?.split('@')[0] || 'Unknown';
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const chatType = isGroup ? '👥 Group' : '👤 Private';

    console.log(`👁️ View once detected from: ${sender}`);

    // Get media type
    const mediaType =
      viewOnceMsg.imageMessage ? 'image' :
      viewOnceMsg.videoMessage ? 'video' :
      viewOnceMsg.audioMessage ? 'audio' :
      null;

    if (!mediaType) return;

    const mediaMessage = viewOnceMsg[`${mediaType}Message`];

    const caption =
      `⚡️ *View Once Auto-Saved!*\n\n` +
      `👤 *From:* ${senderName}\n` +
      `📍 *Chat:* ${chatType}\n` +
      `📱 *Number:* +${sender?.split('@')[0]}\n\n` +
      `_Auto-saved by SpeedyMD_ ⚡`;

    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');

      const buffer = await downloadMediaMessage(
        {
          key: msg.key,
          message: {
            [`${mediaType}Message`]: mediaMessage,
          },
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

      if (!buffer || buffer.length === 0) return;

      // Send to owner privately
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

      // React with ⚡️ in chat
      await sock.sendMessage(from, {
        react: {
          text: '⚡️',
          key: msg.key,
        },
      });

      console.log(`✅ View once auto-saved: ${mediaType} from ${sender}`);

    } catch (err) {
      console.error('❌ ViewOnce download error:', err.message);
    }

  } catch (err) {
    console.error('❌ ViewOnce observer error:', err.message);
  }
}