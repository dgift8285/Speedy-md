import { getToggle } from '../commands/settings.js';
import { getCachedMessage } from '../lib/msgcache.js';

export default async function antiDeleteObserver(sock, msg, { from, isGroup }) {
  try {
    if (from === 'status@broadcast') return;

    const protocolMsg = msg.message?.protocolMessage;
    if (!protocolMsg || protocolMsg.type !== 0) return; // type 0 = REVOKE/delete

    if (!getToggle('antidelete')) return;

    const deletedId = protocolMsg.key?.id;
    if (!deletedId) return;

    const original = getCachedMessage(deletedId);
    if (!original) {
      console.log(`⚠️ Anti-delete: no cached message for ${deletedId}`);
      return;
    }

    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const sender = original.key.participant || original.key.remoteJid;
    const senderName = original.pushName || sender?.split('@')[0] || 'Unknown';
    const chatType = isGroup ? '👥 Group' : '👤 Private';

    const content = original.message;

    const caption =
      `🗑️ *Deleted Message Recovered!*\n\n` +
      `👤 *From:* ${senderName}\n` +
      `📱 *Number:* +${sender?.split('@')[0]}\n` +
      `📍 *Chat:* ${chatType}\n\n` +
      `_Powered by SpeedyMD_ ⚡`;

    // Text message
    const text =
      content?.conversation ||
      content?.extendedTextMessage?.text;

    if (text) {
      await sock.sendMessage(ownerJid, {
        text: `${caption}\n\n💬 *Message:*\n${text}`,
      });
      console.log(`✅ Anti-delete: forwarded text from ${sender}`);
      return;
    }

    // Image
    if (content?.imageMessage) {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        original, 'buffer', {},
        { logger: { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} }, reuploadRequest: sock.updateMediaMessage }
      );
      await sock.sendMessage(ownerJid, {
        image: buffer,
        caption: `${caption}\n\n📝 *Caption:* ${content.imageMessage.caption || '(none)'}`,
      });
      console.log(`✅ Anti-delete: forwarded image from ${sender}`);
      return;
    }

    // Video
    if (content?.videoMessage) {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        original, 'buffer', {},
        { logger: { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} }, reuploadRequest: sock.updateMediaMessage }
      );
      await sock.sendMessage(ownerJid, {
        video: buffer,
        caption: `${caption}\n\n📝 *Caption:* ${content.videoMessage.caption || '(none)'}`,
      });
      console.log(`✅ Anti-delete: forwarded video from ${sender}`);
      return;
    }

    // Audio / voice note
    if (content?.audioMessage) {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        original, 'buffer', {},
        { logger: { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} }, reuploadRequest: sock.updateMediaMessage }
      );
      await sock.sendMessage(ownerJid, { text: caption });
      await sock.sendMessage(ownerJid, {
        audio: buffer,
        mimetype: content.audioMessage.mimetype || 'audio/mpeg',
        ptt: content.audioMessage.ptt || false,
      });
      console.log(`✅ Anti-delete: forwarded audio from ${sender}`);
      return;
    }

    // Sticker
    if (content?.stickerMessage) {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(
        original, 'buffer', {},
        { logger: { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} }, reuploadRequest: sock.updateMediaMessage }
      );
      await sock.sendMessage(ownerJid, { text: caption });
      await sock.sendMessage(ownerJid, { sticker: buffer });
      console.log(`✅ Anti-delete: forwarded sticker from ${sender}`);
      return;
    }

    // Unknown type fallback
    await sock.sendMessage(ownerJid, {
      text: `${caption}\n\n_⚠️ Unsupported message type, could not recover content._`,
    });

  } catch (err) {
    console.error('❌ Anti-delete error:', err.message);
  }
}