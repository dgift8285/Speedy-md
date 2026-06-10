export const name = 'menu';
export const category = 'General';
export const description = 'Shows all available commands';

export async function execute({ sock, from, PREFIX, getAllCommands }) {
  const commands = getAllCommands ? getAllCommands() : new Map();

  const categories = {};
  for (const [cmdName, cmd] of commands) {
    const cat = cmd.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(cmdName);
  }

  let menuText = `╔═══════════════════════╗\n`;
  menuText += `║     ⚡ *SpeedyMD*     ║\n`;
  menuText += `║  Smart.Fast.Always   ║\n`;
  menuText += `╚═══════════════════════╝\n\n`;
  menuText += `📢 *Follow our channel:*\n`;
  menuText += `https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G\n\n`;

  for (const [category, cmds] of Object.entries(categories)) {
    menuText += `*📁 ${category}*\n`;
    for (const cmd of cmds) {
      menuText += `  ├ ${PREFIX}${cmd}\n`;
    }
    menuText += `\n`;
  }

  menuText += `_Total: ${commands.size} commands_\n`;
  menuText += `_Prefix: ${PREFIX}_\n`;
  menuText += `_Powered by SwiftBot Tec_ 🚀`;

  await sock.sendMessage(from, { text: menuText });
    }
