import { getValue, setValue } from '../lib/state.js';

export const name = ['settings', 'config', 'set'];
export const category = 'General';
export const description = 'View and toggle bot settings';

const TOGGLES = [
  { key: 'antilink', label: '🔗 Anti-Link' },
  { key: 'antitag', label: '🏷️ Anti-Tag' },
  { key: 'antidelete', label: '🗑️ Anti-Delete' },
  { key: 'statusantidelete', label: '📊 Status Anti-Delete' },
  { key: 'anticall', label: '📞 Anti-Call' },
  { key: 'groupevents', label: '🎉 Group Events' },
  { key: 'autoread', label: '👓 Auto Read' },
  { key: 'autobio', label: '📝 Auto Bio' },
  { key: 'greet', label: '👋 Greet (DM Auto-Reply)' },
];

export function getToggle(key) {
  return getValue(`toggle_${key}`, false);
}

export function setToggle(key, value) {
  setValue(`toggle_${key}`, value);
}

export async function execute({ sock, from, args }) {
  const sub = args[0]?.toLowerCase();
  const value = args[1]?.toLowerCase();

  if (sub && value && (value === 'on' || value === 'off')) {
    const found = TOGGLES.find(t => t.key === sub);
    if (!found) {
      return await sock.sendMessage(from, {
        text: `❌ *Unknown setting:* ${sub}\n\nType *.settings* to see all options.`
      });
    }
    setToggle(sub, value === 'on');
    return await sock.sendMessage(from, {
      text: `✅ *${found.label}* is now *${value === 'on' ? 'ON ✅' : 'OFF ❌'}*`
    });
  }

  let text = `⚙️ *Bot Config — ${process.env.BOT_NAME || 'SpeedyMD'}*\n\n`;
  for (const t of TOGGLES) {
    const state = getToggle(t.key) ? '✅ ON' : '❌ OFF';
    text += `${t.label} — *${state}*\n`;
  }
  text += `\n_Toggle with:_ *.settings <name> on/off*\n`;
  text += `_Example:_ *.settings antilink on*\n\n`;
  text += `_Available keys:_ ${TOGGLES.map(t => t.key).join(', ')}\n\n`;
  text += `_Powered by SpeedyMD_ ⚡`;

  await sock.sendMessage(from, { text });
}