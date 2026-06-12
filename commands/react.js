export const name = 'react';
export const category = 'Fun';
export const description = 'Auto react to every message with random emojis';

const autoReactChats = new Set();

const emojis = [
  '❤️', '🔥', '😂', '😍', '🥰', '😎', '🤩', '💯',
  '👏', '🎉', '✨', '💪', '🙌', '😊', '🥳', '💥',
  '🤣', '😆', '🫶', '💙', '💚', '💛', '🧡', '💜',
  '⚡', '🌟', '🎯', '🔮', '🎸', '🏆', '👑', '🌈',
  '🦁', '🐯', '🦊', '🐺', '🦅', '🌊', '🍀', '🌸',
];

export function getAutoReactChats() {
  return autoReactChats;
}

export async function execute({ sock, msg, from, args }) {
  const action = args[0]?.toLowerCase();

  if (!action || (action !== 'on' && action !== 'off')) {
    const status = autoReactChats.has(from) ? '✅ ON' : '❌ OFF';
    return await sock.sendMessage(from, {
      text: `⚡ *AutoReact*\n\n` +
            `Current Status: *${status}*\n\n` +
            `Usage:\n` +
            `▸ *.react on* — Enable\n` +
            `▸ *.react off* — Disable\n\n` +
            `_Bot will react to every message with random emojis!_`
    });
  }

  if (action === 'on') {
    autoReactChats.add(from);
    await sock.sendMessage(from, {
      text: `✅ *AutoReact Enabled!*\n\n` +
            `I will now react to every message! ${emojis[Math.floor(Math.random() * emojis.length)]}`
    });
  } else {
    autoReactChats.delete(from);
    await sock.sendMessage(from, {
      text: `❌ *AutoReact Disabled!*\n\nNo more auto reactions.`
    });
  }
}