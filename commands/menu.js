import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const name = 'menu';
export const category = 'General';
export const description = 'Shows all available commands';

export async function execute({ sock, msg, from, PREFIX, getAllCommands }) {
  const commands = getAllCommands ? getAllCommands() : new Map();

  const categories = {};
  for (const [cmdName, cmd] of commands) {
    const cat = cmd.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ name: cmdName, desc: cmd.description || '' });
  }

  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  let menu = '';
  menu += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
  menu += `      ⚡ *S P E E D Y M D* ⚡\n`;
  menu += `    _Smart · Fast · Always_\n`;
  menu += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;
  menu += `  🕐 *${time}*  |  📅 *${date}*\n\n`;
  menu += `📢 *Channel:*\n`;
  menu += `https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G\n\n`;
  menu += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;

  for (const [category, cmds] of Object.entries(categories)) {
    menu += `⫸ *${category.toUpperCase()}*\n`;
    const cmdNames = cmds.map(c => `⦿ ${PREFIX}${c.name}`);
    for (let i = 0; i < cmdNames.length; i += 2) {
      if (cmdNames[i + 1]) {
        menu += ` ${cmdNames[i].padEnd(15)} ${cmdNames[i + 1]}\n`;
      } else {
        menu += ` ${cmdNames[i]}\n`;
      }
    }
    menu += `\n`;
  }

  menu += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
  menu += `  📊 *Total:* ${commands.size} commands\n`;
  menu += `  🔑 *Prefix:* [ ${PREFIX} ]\n`;
  menu += `  🤖 *Bot:* ${process.env.BOT_NAME || 'SpeedyMD'}\n`;
  menu += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
  menu += `     ⚡ _SwiftBot Tec_ 🚀`;

  // Try to get bot profile picture
  try {
    const profilePic = await sock.profilePictureUrl(sock.user.id, 'image');

    if (profilePic) {
      // Download profile picture
      const { default: axios } = await import('axios');
      const response = await axios.get(profilePic, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const imageBuffer = Buffer.from(response.data);

      // Send menu with profile picture
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: menu,
      }, { quoted: msg });
      return;
    }
  } catch {
    // Profile picture not available fallback to text
  }

  // Fallback: check local botlogo.jpg
  try {
    const imgPath = join(__dirname, '../botlogo.jpg');
    if (fs.existsSync(imgPath)) {
      const imageBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: menu,
      }, { quoted: msg });
      return;
    }
  } catch {
    // Local image not available
  }

  // Final fallback: send text only
  await sock.sendMessage(from, { text: menu });
}