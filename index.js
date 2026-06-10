import baileys from '@whiskeysockets/baileys';
const {
  default: makeWASocket,
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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

const SESSION_ID = process.env.SESSION_ID || 'speedymd_session';
const SESSION_DIR = join(__dirname, 'session');
const OWNER = process.env.OWNER_NUMBER + '@s.whatsapp.net';
const BOT_NAME = process.env.BOT_NAME || 'SpeedyMD';
const PREFIX = process.env.PREFIX || '.';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G';

// Express + Socket.IO setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: BOT_NAME,
    message: 'SpeedyMD is running! ⚡'
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// Save session to Supabase
let lastSync = 0;
async function syncToSupabase() {
  const now = Date.now();
  if (now - lastSync < 2 * 60 * 1000) return;
  lastSync = now;
  try {
    if (!fs.existsSync(SESSION_DIR)) return;
    const zip = new AdmZip();
    zip.addLocalFolder(SESSION_DIR);
    const zipBuffer = zip.toBuffer();
    const base64 = zipBuffer.toString('base64');
    await supabase
      .from('bu_sessions')
      .upsert({ id: SESSION_ID, data: base64 });
    console.log('💾 Session saved to Supabase');
  } catch (err) {
    console.error('❌ Supabase sync error:', err.message);
  }
}

// Load session from Supabase
async function loadFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', SESSION_ID)
      .single();
    if (error || !data) return false;
    const zipBuffer = Buffer.from(data.data, 'base64');
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(SESSION_DIR, true);
    console.log('📦 Session loaded from Supabase');
    return true;
  } catch (err) {
    console.error('❌ Session load error:', err.message);
    return false;
  }
}

// Main bot function
async function startBot() {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR);
  await loadFromSupabase();

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
  });

  // Handle pair code request from browser
  io.on('connection', (socket) => {
    console.log('🌐 Browser connected to pair page');

    socket.on('requestPairCode', async (phone) => {
      try {
        const code = await sock.requestPairingCode(phone);
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log(`📲 Pair code for ${phone}: ${formatted}`);
        socket.emit('pairCode', formatted);
      } catch (err) {
        console.error('❌ Pair code error:', err.message);
        socket.emit('pairError', err.message);
      }
    });
  });

  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      io.emit('qr', qr);
      console.log('📱 QR Code generated — open /pair.html to scan');
    }

    if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} connected successfully!`);
      io.emit('connected');
      await syncToSupabase();

      // Set profile picture
try {
  const imgPath = join(__dirname, 'botlogo.jpg');
  if (fs.existsSync(imgPath)) {
    const img = fs.readFileSync(imgPath);
    const botJid = sock.user.id;
    await sock.updateProfilePicture(botJid, {
      url: imgPath,
    });
    console.log('🖼️ Profile picture updated!');
  } else {
    console.log('⚠️ botlogo.jpg not found!');
  }
} catch (err) {
  console.log('⚠️ Could not set profile picture:', err.message);
}

      // Send owner connect message
      try {
        await sock.sendMessage(OWNER, {
          text: `✅ *${BOT_NAME} is now online!*\n\n⚡ _Smart. Fast. Always Here._\n\n📢 *Follow our channel:*\n${CHANNEL_LINK}\n\nPrefix: *${PREFIX}*\nOwner: *${process.env.OWNER_NUMBER}*`
        });
      } catch (err) {
        console.log('⚠️ Could not send owner message:', err.message);
      }
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || '';

      console.log('🔴 Connection closed. Reason:', reason);

      if (errorMessage.includes('conflict')) {
        console.log('⚠️ Stream conflict! Exiting...');
        process.exit(1);
      }

      if (reason === DisconnectReason.loggedOut) {
        console.log('🚪 Bot logged out. Clearing session...');
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        await supabase
          .from('bu_sessions')
          .delete()
          .eq('id', SESSION_ID);
        startBot();
      } else {
        console.log('🔄 Reconnecting in 5 seconds...');
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    await syncToSupabase();
  });

  sock.ev.on('messages.upsert', async (m) => {
    await handleMessage(sock, m, PREFIX);
  });
}

startBot();
