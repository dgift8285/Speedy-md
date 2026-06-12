import { getStatusViewEnabled } from '../commands/status.js';

export default async function statusObserver(sock, msg, { from }) {
  try {
    // Check if status broadcast
    if (from !== 'status@broadcast') return;

    // Check if enabled
    const enabled = getStatusViewEnabled();
    if (!enabled.has(sock.user?.id)) return;

    const key = msg.key;
    if (!key) return;

    const participant = key.participant || key.remoteJid;
    if (!participant) return;

    console.log(`👁️ Status from: ${participant}`);

    // View status
    try {
      await sock.readMessages([key]);
      console.log(`✅ Viewed status: ${participant}`);
    } catch (err) {
      console.log(`⚠️ Could not view status: ${err.message}`);
    }

    // Wait 1 second
    await new Promise(r => setTimeout(r, 1000));

    // React with heart
    try {
      await sock.sendMessage('status@broadcast', {
        react: {
          text: '❤️',
          key: key,
        },
      });
      console.log(`❤️ Reacted to status: ${participant}`);
    } catch (err) {
      console.log(`⚠️ Could not react: ${err.message}`);
    }

  } catch (err) {
    console.error('❌ Status observer error:', err.message);
  }
}