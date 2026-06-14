import { getToggle } from '../commands/settings.js';

export default async function antiLinkObserver(sock, msg, { from, sender, isGroup, body }) {
  try {
    if (!isGroup) return;
    if (!getToggle('antilink')) return;
    if (!body) return;

    const linkRegex = /(chat\.whatsapp\.com\/|https?:\/\/)/i;
    if (!linkRegex.test(body)) return;

    // Check if sender is admin - skip if we can't determine, to avoid wrongly deleting admin messages
    let groupMetadata;
    try {
      groupMetadata = await sock.groupMetadata(from);
    } catch {
      return;
    }

    const senderClean = sender?.split(':')[0];
    const participant = groupMetadata.participants?.find(p =>
      p.id.split(':')[0] === senderClean || p.id === sender
    );

    if (participant?.admin) return; // admins exempt

    // Delete the message
    try {
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          id: msg.key.id,
          participant: msg.key.participant || sender,
          fromMe: false,
        }
      });
      console.log(`🔗 Anti-link: deleted message from ${sender}`);
    } catch (err) {
      console.log('⚠️ Anti-link delete failed:', err.message);
    }

  } catch (err) {
    console.error('❌ Anti-link error:', err.message);
  }
}