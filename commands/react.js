import { getSet, saveSet } from '../lib/state.js';

export const name = 'react';
export const category = 'Fun';
export const description = 'Auto react to every message with random emojis';

const emojis = [
  '❤️', '🔥', '😂', '😍', '🥰', '😎', '🤩', '💯',
  '👏', '🎉', '✨', '💪', '🙌', '😊', '🥳', '💥',
  '🤣', '😆', '🫶', '💙', '💚', '💛', '🧡', '💜',
  '⚡', '🌟', '🎯', '🔮', '🎸', '🏆', '👑', '🌈',
];

export function getAutoReactChats() {
  return getSet('autoReactChats');
}

export async function execute({ sock, from, args }) {
  const action = args[0]?.toLowerCase();
  const autoReactChats = getSet('autoReactChats');

  if (!action || (action !== 'on' && action !== 'off')) {
    const status = autoReactChats.has(from) ? '✅ ON' : '❌ OFF';
    return await sock.sendMessage(from, {
      text:
        `⚡ *AutoReact*\n\n` +
        `Status: *${status}*\n\n` +
        `▸ *.react on* — Enable\n` +
        `▸ *.react off* — Disable`
    });
  }

  if (action === 'on') {
    autoReactChats.add(from);
    saveSet('autoReactChats', autoReactChats);
    await sock.sendMessage(from, {
      text: `✅ *AutoReact Enabled!*\n\nReacting to every message! ${emojis[Math.floor(Math.random() * emojis.length)]}`
    });
  } else {
    autoReactChats.delete(from);
    saveSet('autoReactChats', autoReactChats);
    await sock.sendMessage(from, {
      text: `❌ *AutoReact Disabled!*`
    });
  }
}