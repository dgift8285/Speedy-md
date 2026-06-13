import { getSet } from '../lib/state.js';

const emojis = [
  '❤️', '🔥', '😂', '😍', '🥰', '😎', '🤩', '💯',
  '👏', '🎉', '✨', '💪', '🙌', '😊', '🥳', '💥',
  '🤣', '😆', '🫶', '💙', '💚', '💛', '🧡', '💜',
  '⚡', '🌟', '🎯', '🔮', '🎸', '🏆', '👑', '🌈',
];

export default async function autoReactObserver(sock, msg, { from }) {
  try {
    const key = msg.key;
    if (!key) return;

    const autoReactChats = getSet('autoReactChats');
    if (!autoReactChats.has(from)) return;

    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    await sock.sendMessage(from, {
      react: { text: emoji, key },
    });
  } catch (err) {
    console.error('❌ AutoReact error:', err.message);
  }
}