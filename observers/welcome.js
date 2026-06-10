import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File to remember who we already welcomed
const seenFile = join(__dirname, '../seen_users.json');

function loadSeen() {
  try {
    if (fs.existsSync(seenFile)) {
      return JSON.parse(fs.readFileSync(seenFile, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSeen(seen) {
  try {
    fs.writeFileSync(seenFile, JSON.stringify(seen), 'utf8');
  } catch {}
}

export default async function welcomeObserver(sock, msg, { from, sender, isGroup }) {
  try {
    // Only welcome in private chats
    if (isGroup) return;
    if (!sender) return;

    const seen = loadSeen();

    // If we already welcomed this person skip
    if (seen[sender]) return;

    // Mark as seen
    seen[sender] = true;
    saveSeen(seen);

    const BOT_NAME = process.env.BOT_NAME || 'SpeedyMD';
    const PREFIX = process.env.PREFIX || '.';
    const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G';

    await sock.sendMessage(from, {
      text: `👋 *Welcome to ${BOT_NAME}!*\n\n⚡ _Smart. Fast. Always Here._\n\n📢 *Follow our official channel for updates:*\n${CHANNEL_LINK}\n\n✨ Type *${PREFIX}menu* to see all available commands!\n\n_Powered by SwiftBot Tec_ 🚀`
    });

  } catch (err) {
    console.error('❌ Welcome observer error:', err.message);
  }
  }
