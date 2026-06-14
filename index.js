import baileys from '@whiskeysockets/baileys';
const makeWASocket = baileys.default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = baileys;

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import AdmZip from 'adm-zip';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import pino from 'pino';
import { handleMessage } from './lib/router.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cleanJid(jid) {
  if (!jid) return null;
  return jid.includes(':')
    ? jid.split(':')[0] + '@s.whatsapp.net'
    : jid;
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { realtime: { transport: ws } }
);

const SESSION_ID = process.env.SESSION_ID || 'speedymd_session';
const SESSION_DIR = join(__dirname, 'session');
const OWNER = process.env.OWNER_NUMBER + '@s.whatsapp.net';
const BOT_NAME = process.env.BOT_NAME || 'SpeedyMD';
const PREFIX = process.env.PREFIX || '.';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: BOT_NAME,
    message: 'SpeedyMD is running! ⚡',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// Self ping every 4 minutes to stay awake
setInterval(async () => {
  try {
    const https = await import('https');
    https.default.get('https://speedy-md.onrender.com/health', (res) => {
      console.log('🏓 Self ping:', res.statusCode);
    }).on('error', () => {});
  } catch {}
}, 4 * 60 * 1000);

async function syncToSupabase(sessionId, sessionDir) {
  try {
    if (!fs.existsSync(sessionDir)) return;
    const zip = new AdmZip();
    zip.addLocalFolder(sessionDir);
    const base64 = zip.toBuffer().toString('base64');
    await supabase
      .from('bu_sessions')
      .upsert({ id: sessionId, data: base64 });
    console.log('💾 Session saved:', sessionId);
  } catch (err) {
    console.error('❌ Supabase sync error:', err.message);
  }
}

async function loadFromSupabase(sessionId, sessionDir) {
  try {
    const { data, error } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', sessionId)
      .single();
    if (error || !data) return false;
    const zip = new AdmZip(Buffer.from(data.data, 'base64'));
    zip.extractAllTo(sessionDir, true);
    console.log('📦 Session loaded:', sessionId);
    return true;
  } catch (err) {
    console.error('❌ Session load error:', err.message);
    return false;
  }
}

async function startBot() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  await loadFromSupabase(SESSION_ID, SESSION_DIR);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'silent' })
      ),
    },
    printQRInTerminal: false,
    syncFullHistory: false,
    fireInitQueries: false,
    logger: pino({ level: 'silent' }),
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  io.on('connection', (socket) => {
    console.log('🌐 Browser connected');

    socket.on('requestPairCode', async (phone) => {
      try {
        const code = await sock.requestPairingCode(phone);
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
        socket.emit('pairCode', formatted);
      } catch (err) {
        socket.emit('pairError', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('🌐 Browser disconnected');
    });
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      io.emit('qr', qr);
      console.log('📱 Main bot QR generated');
    }

    if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} connected!`);
      io.emit('connected');
      await syncToSupabase(SESSION_ID, SESSION_DIR);

      try {
        const imgPath = join(__dirname, 'botlogo.jpg');
        if (fs.existsSync(imgPath)) {
          const imgBuffer = fs.readFileSync(imgPath);
          await sock.updateProfilePicture(sock.user.id, imgBuffer);
          console.log('🖼️ Profile picture updated!');
        }
      } catch (err) {
        console.log('⚠️ Profile picture error:', err.message);
      }

      try {
        await sock.sendMessage(OWNER, {
          text:
            `✅ *${BOT_NAME} is now online!*\n\n` +
            `⚡ _Smart. Fast. Always Here._\n\n` +
            `📢 *Follow our channel:*\n` +
            `${CHANNEL_LINK}\n\n` +
            `Prefix: *${PREFIX}*\n` +
            `Owner: *${process.env.OWNER_NUMBER}*`
        });
      } catch (err) {
        console.log('⚠️ Owner message error:', err.message);
      }
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || '';
      console.log('🔴 Main bot closed. Reason:', reason);

      if (errorMessage.includes('conflict')) {
        console.log('⚠️ Conflict! Exiting...');
        process.exit(1);
      }

      if (reason === DisconnectReason.loggedOut) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        await supabase.from('bu_sessions').delete().eq('id', SESSION_ID);
        setTimeout(startBot, 3000);
      } else if (reason === DisconnectReason.restartRequired) {
        setTimeout(startBot, 3000);
      } else if (reason === DisconnectReason.timedOut) {
        setTimeout(startBot, 5000);
      } else {
        setTimeout(startBot, 5000);
      }
    }
  });

  // Auto greet when bot is added to a group
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;
      const botJid = cleanJid(sock.user.id);

      if (action === 'add') {
        const wasAdded = participants.some(p => cleanJid(p) === botJid);
        if (wasAdded) {
          console.log(`✅ Bot added to group: ${id}`);
          await sock.sendMessage(id, {
            text:
              `👋 *Hello everyone!*\n\n` +
              `⚡ *SpeedyMD* is here!\n\n` +
              `📋 Type *${PREFIX}menu* to see all commands\n\n` +
              `⚠️ *Please make me admin* to use group commands!\n\n` +
              `_Powered by SwiftBot Tec_ 🚀`
          });
        }
      }

      if (action === 'promote') {
        const botPromoted = participants.some(p => cleanJid(p) === botJid);
        if (botPromoted) {
          console.log(`👑 Bot promoted to admin in: ${id}`);
          await sock.sendMessage(id, {
            text:
              `✅ *Thanks for making me admin!*\n\n` +
              `👑 I now have full access to group commands!\n\n` +
              `📋 Type *${PREFIX}menu* to see all commands\n\n` +
              `_Powered by SpeedyMD_ ⚡`
          });
        }
      }
    } catch (err) {
      console.error('❌ Group update error:', err.message);
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    await syncToSupabase(SESSION_ID, SESSION_DIR);
  });

  sock.ev.on('messages.upsert', async (m) => {
    await handleMessage(sock, m, PREFIX);
  });
}

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err?.message || err);
});

startBot();