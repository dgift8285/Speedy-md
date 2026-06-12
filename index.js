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
    message: 'SpeedyMD is running! ⚡'
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// Active user bots
const activeBots = new Map();

// Generate session ID
function generateSessionId(phone) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const phoneEnd = phone.slice(-4);
  return `SPEEDY_${phoneEnd}_${timestamp}_${random}`;
}

// Save session to Supabase
let lastSync = 0;
async function syncToSupabase(sessionId, sessionDir) {
  const now = Date.now();
  if (now - lastSync < 2 * 60 * 1000) return;
  lastSync = now;
  try {
    if (!fs.existsSync(sessionDir)) return;
    const zip = new AdmZip();
    zip.addLocalFolder(sessionDir);
    const zipBuffer = zip.toBuffer();
    const base64 = zipBuffer.toString('base64');
    await supabase
      .from('bu_sessions')
      .upsert({ id: sessionId, data: base64 });
    console.log('💾 Session saved:', sessionId);
  } catch (err) {
    console.error('❌ Supabase sync error:', err.message);
  }
}

// Load session from Supabase
async function loadFromSupabase(sessionId, sessionDir) {
  try {
    const { data, error } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', sessionId)
      .single();
    if (error || !data) return false;
    const zipBuffer = Buffer.from(data.data, 'base64');
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(sessionDir, true);
    console.log('📦 Session loaded:', sessionId);
    return true;
  } catch (err) {
    console.error('❌ Session load error:', err.message);
    return false;
  }
}

// Start user session for pair page
async function startUserSession(socket, phone) {
  const userSessionId = generateSessionId(phone);
  const userSessionDir = join(__dirname, `user_sessions/${userSessionId}`);

  console.log(`📱 Starting session for ${phone}`);

  if (!fs.existsSync(userSessionDir)) {
    fs.mkdirSync(userSessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(userSessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const userSock = makeWASocket({
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

  // Handle pair code request
  socket.on('requestPairCode', async (userPhone) => {
    try {
      const code = await userSock.requestPairingCode(userPhone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      socket.emit('pairCode', formatted);
    } catch (err) {
      socket.emit('pairError', err.message);
    }
  });

  userSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      socket.emit('qr', qr);
      console.log(`📱 QR for ${phone}`);
    }

    if (connection === 'open') {
  console.log(`✅ User connected: ${phone}`);

  // Emit to browser FIRST before anything else
  socket.emit('sessionReady', userSessionId);
  console.log(`📡 sessionReady emitted: ${userSessionId}`);

  await saveCreds();

  // Save session to Supabase in background
  const zip = new AdmZip();
  zip.addLocalFolder(userSessionDir);
  const zipBuffer = zip.toBuffer();
  const base64 = zipBuffer.toString('base64');
  await supabase
    .from('bu_sessions')
    .upsert({ id: userSessionId, data: base64 });

  console.log(`💾 User session saved: ${userSessionId}`);

  // Send session ID to user WhatsApp
  try {
    const userJid = phone + '@s.whatsapp.net';
    await userSock.sendMessage(userJid, {
          text:
            `🎉 *Welcome to SpeedyMD!*\n\n` +
            `✅ Your session has been created!\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔑 *Your Session ID:*\n` +
            `\`\`\`${userSessionId}\`\`\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⚡ Go back to the website\n` +
            `and click *Deploy Bot* to\n` +
            `start your bot instantly!\n\n` +
            `📢 *Follow our channel:*\n` +
            `${CHANNEL_LINK}\n\n` +
            `_Powered by SwiftBot Tec_ ⚡`
        });
      } catch (err) {
        console.error('❌ Could not send session ID:', err.message);
      }

      // Notify browser
      socket.emit('sessionReady', userSessionId);

      // Close temp session
      setTimeout(async () => {
        try { userSock.end(); } catch {}
        try {
          fs.rmSync(userSessionDir, { recursive: true, force: true });
        } catch {}
      }, 15000);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`🔴 User session closed: ${phone}, reason: ${reason}`);
      if (reason !== DisconnectReason.loggedOut) {
        socket.emit('sessionError', 'Connection failed. Please try again.');
      }
    }
  });

  userSock.ev.on('creds.update', saveCreds);
}

// Deploy user bot
async function deployUserBot(socket, phone, sessionId) {
  try {
    console.log(`🚀 Deploying bot for ${phone} with session ${sessionId}`);

    // Check if already running
    if (activeBots.has(sessionId)) {
      socket.emit('botDeployed', { sessionId, phone });
      return;
    }

    // Load session from Supabase
    const userSessionDir = join(__dirname, `running_bots/${sessionId}`);
    if (!fs.existsSync(userSessionDir)) {
      fs.mkdirSync(userSessionDir, { recursive: true });
    }

    const loaded = await loadFromSupabase(sessionId, userSessionDir);
    if (!loaded) {
      socket.emit('deployError', 'Session not found. Please get a new Session ID.');
      return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(userSessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const userSock = makeWASocket({
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

    activeBots.set(sessionId, userSock);

    userSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`✅ User bot live: ${phone}`);

        // Notify browser
        socket.emit('botDeployed', { sessionId, phone });

        // Send confirmation to user WhatsApp
        try {
          const userJid = phone + '@s.whatsapp.net';
          await userSock.sendMessage(userJid, {
            text:
              `🎉 *Your SpeedyMD Bot is LIVE!*\n\n` +
              `✅ Bot is now running!\n\n` +
              `🤖 *Bot Name:* SpeedyMD\n` +
              `📱 *Your Number:* +${phone}\n` +
              `⚡ *Prefix:* ${PREFIX}\n\n` +
              `📋 *Try these commands:*\n` +
              `▸ ${PREFIX}menu — See all commands\n` +
              `▸ ${PREFIX}ping — Check bot speed\n` +
              `▸ ${PREFIX}alive — Bot status\n` +
              `▸ ${PREFIX}play — Play music\n` +
              `▸ ${PREFIX}tt — Download TikTok\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━\n` +
              `📢 *Follow our channel:*\n` +
              `${CHANNEL_LINK}\n\n` +
              `_Powered by SwiftBot Tec_ ⚡`
          });
        } catch (err) {
          console.error('❌ Could not send deploy message:', err.message);
        }

        // Save session periodically
        setInterval(async () => {
          await syncToSupabase(sessionId, userSessionDir);
        }, 5 * 60 * 1000);
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔴 User bot closed: ${phone}, reason: ${reason}`);
        activeBots.delete(sessionId);

        if (reason !== DisconnectReason.loggedOut) {
          // Reconnect after 5 seconds
          setTimeout(() => {
            deployUserBot(socket, phone, sessionId);
          }, 5000);
        }
      }
    });

    userSock.ev.on('creds.update', async () => {
      await saveCreds();
      await syncToSupabase(sessionId, userSessionDir);
    });

    userSock.ev.on('messages.upsert', async (m) => {
      await handleMessage(userSock, m, PREFIX);
    });

  } catch (err) {
    console.error('❌ Deploy error:', err.message);
    socket.emit('deployError', err.message);
  }
}

// Main bot
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
  });

  // Handle browser connections
  io.on('connection', (socket) => {
    console.log('🌐 Browser connected');

    // Start user session
    socket.on('startSession', async (phone) => {
      try {
        await startUserSession(socket, phone);
      } catch (err) {
        console.error('❌ Session error:', err.message);
        socket.emit('sessionError', err.message);
      }
    });

    // Deploy user bot
    socket.on('deployBot', async ({ sessionId, phone }) => {
      try {
        await deployUserBot(socket, phone, sessionId);
      } catch (err) {
        console.error('❌ Deploy error:', err.message);
        socket.emit('deployError', err.message);
      }
    });

    // Main bot pair code
    socket.on('requestPairCode', async (phone) => {
      try {
        const code = await sock.requestPairingCode(phone);
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
        socket.emit('pairCode', formatted);
      } catch (err) {
        socket.emit('pairError', err.message);
      }
    });
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      io.emit('qr', qr);
      console.log('📱 QR generated');
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
            `📢 *Follow our channel:*\n${CHANNEL_LINK}\n\n` +
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

      console.log('🔴 Connection closed. Reason:', reason);

      if (errorMessage.includes('conflict')) {
        console.log('⚠️ Stream conflict! Exiting...');
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

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    await syncToSupabase(SESSION_ID, SESSION_DIR);
  });

  sock.ev.on('messages.upsert', async (m) => {
    await handleMessage(sock, m, PREFIX);
  });
}

startBot();