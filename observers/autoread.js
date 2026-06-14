import { getToggle } from '../commands/settings.js';

export default async function autoReadObserver(sock, msg, { from }) {
  try {
    if (from === 'status@broadcast') return;
    if (!getToggle('autoread')) return;
    if (!msg.key) return;

    await sock.readMessages([msg.key]);
  } catch (err) {
    console.error('❌ Auto-read error:', err.message);
  }
}