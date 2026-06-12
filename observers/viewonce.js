import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default async function viewOnceObserver(sock, msg, { from, isGroup }) {
  try {
    const message = msg.message;
    if (!message) return;

    // Detect view once in ALL possible locations
    let viewOnceInner = null;

    if (message.viewOnceMessage?.message) {
      viewOnceInner = message.viewOnceMessage.message;
    } else if (message.viewOnceMessageV2?.message) {
      viewOnceInner = message.viewOnceMessageV2.message;
    } else if (message.viewOnceMessageV2Extension?.message) {
      viewOnceInner = message.viewOnceMessageV2Extension.message;
    }

    if (!viewOnceInner) return;

    // Get media type
    let mediaType = null;
    let mediaMessage = null;

    if (viewOnceInner.imageMessage) {
      mediaType = 'image';
      mediaMessage = viewOnceInner.imageMessage;
    } else if (viewOnceInner.videoMessage) {
      mediaType = 'video';
      mediaMessage = viewOnceInner.videoMessage;
    } else if (viewOnceInner.audioMessage) {
      mediaType = 'audio';
      mediaMessage = viewOnceInner.audioMessage;
    }

    if (!mediaType || !mediaMessage) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || sender?.split('@')[0] || 'Unknown';
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const chatType = isGroup ? '👥 Group' : '👤 Private';

    console.log(`👁️ View once detected: ${mediaType} from ${sender}`);

    const caption =
      `⚡️ *View Once Auto-Saved!*\n\n` +
      `👤 *From:* ${senderName}\n` +
      `📍 *Chat:* ${chatType}\n` +
      `📱 *Number:* +${sender?.split('@')[0]}\n\n` +
      `_Auto-saved by SpeedyMD_ ⚡`;

    // Download media
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

    if (!buffer || buffer.length === 0) {
      console.log('⚠️ Empty buffer for view once');
      return;
    }

    console.log(`✅ Downloaded view once: ${buffer.length} bytes`);

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
        mimetype: mediaMessage.mimetype || 'audio/mpeg',
        pttAudio: mediaMessage.ptt || false,
      });
    }

    // React with ⚡️
    await sock.sendMessage(from, {
      react: {
        text: '⚡️',
        key: msg.key,
      },
    });

    console.log(`✅ View once saved and sent to owner`);

  } catch (err) {
    console.error('❌ ViewOnce observer error:', err.message);
  }
}