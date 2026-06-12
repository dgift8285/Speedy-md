const emojis = [
  '❤️', '🔥', '😂', '😍', '🥰', '😎', '🤩', '💯',
  '👏', '🎉', '✨', '💪', '🙌', '😊', '🥳', '💥',
  '🤣', '😆', '🫶', '💙', '💚', '💛', '🧡', '💜',
  '⚡', '🌟', '🎯', '🔮', '🎸', '🏆', '👑', '🌈',
  '🦁', '🐯', '🦊', '🐺', '🦅', '🌊', '🍀', '🌸',
];

export default async function autoReactObserver(sock, msg, { from }) {
  try {
    const key = msg.key;
    if (!key) return;

    // React to every single message everywhere
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