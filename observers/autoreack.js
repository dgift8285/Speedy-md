import { getAutoReactChats } from '../commands/react.js';

const emojis = [
  '❤️', '🔥', '😂', '😍', '🥰', '😎', '🤩', '💯',
  '👏', '🎉', '✨', '💪', '🙌', '😊', '🥳', '💥',
  '🤣', '😆', '🫶', '💙', '💚', '💛', '🧡', '💜',
  '⚡', '🌟', '🎯', '🔮', '🎸', '🏆', '👑', '🌈',
  '🦁', '🐯', '🦊', '🐺', '🦅', '🌊', '🍀', '🌸',
];

export default async function autoReactObserver(sock, msg, { from }) {
  try {
    const autoReactChats = getAutoReactChats();
    if (!autoReactChats.has(from)) return;
    const key = msg.key;
    if (!key) return;
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    await sock.sendMessage(from, {
      react: {
        text: emoji,
        key: key,
      },
    });
  } catch (err) {
    console.error('❌ AutoReact error:', err.message);
  }
}