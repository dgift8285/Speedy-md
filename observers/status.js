import { getStatusViewEnabled } from '../commands/status.js';

export default async function statusObserver(sock, msg, { from }) {
  try {
    // Only handle status updates
    if (from !== 'status@broadcast') return;

    // Check if enabled
    const statusViewEnabled = getStatusViewEnabled();
    if (!statusViewEnabled.has(sock.user.id)) return;

    const key = msg.key;
    if (!key) return;

    const participant = key.participant;
    if (!participant) return;

    // View the status
    await sock.readMessages([key]);
    console.log(`👁️ Viewed status from: ${participant}`);

    // Wait 1 second then react
    await new Promise(r => setTimeout(r, 1000));

    // React with heart
    await sock.sendMessage('status@broadcast', {
      react: {
        text: '❤️',
        key: key,
      },
    });

    console.log(`❤️ Reacted to status from: ${participant}`);

  } catch (err) {
    console.error('❌ Status observer error:', err.message);
  }
}