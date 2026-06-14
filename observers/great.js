import { getToggle } from '../commands/settings.js';
import { getSet, saveSet } from '../lib/state.js';

export default async function greetObserver(sock, msg, { from, isGroup }) {
  try {
    if (isGroup) return;
    if (!getToggle('greet')) return;

    const greeted = getSet('greetedUsers');
    if (greeted.has(from)) return;

    greeted.add(from);
    saveSet('greetedUsers', greeted);

    const BOT_NAME = process.env.BOT_NAME || 'SpeedyMD';
    const PREFIX = process.env.PREFIX || '.';

    await sock.sendMessage(from, {
      text:
        `👋 *Hello! Welcome to ${BOT_NAME}!*\n\n` +
        `⚡ _Smart. Fast. Always Here._\n\n` +
        `📋 Type *${PREFIX}menu* to see what I can do!\n\n` +
        `_Powered by SwiftBot Tec_ 🚀`
    });
  } catch (err) {
    console.error('❌ Greet error:', err.message);
  }
}