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

// Express + Socket.IO
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

// Active deployed bots
const activeBots = new Map();

// Generate session ID
function generateSessionId(phone) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const phoneEnd = phone.slice(-4);
  return `SPEEDY_${phoneEnd}_${timestamp}_${random}`;
}

// Save session to Supabase
async function syncToSupabase(sessionId, sessionDir) {
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

  console.log(`📱 Starting user session for ${phone}`);

  try {
    // Clean old sessions for this phone
    const baseDir = join(__dirname, 'user_sessions');
    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir).filter(d =>
        d.includes(phone.slice(-4))
      );
      for (const dir of dirs) {
        // Don't clean old sessions - causes creds.json error
console.log(`📱 Creating fresh session dir: ${userSessionDir}`);

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
    browser: ['SpeedyMD-Pair', 'Safari', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 2000,
  });

  // Handle pair code
  socket.on('requestPairCode', async (userPhone) => {
    try {
      const code = await userSock.requestPairingCode(userPhone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(`📲 Pair code for ${userPhone}: ${formatted}`);
      socket.emit('pairCode', formatted);
    } catch (err) {
      console.error('❌ Pair code error:', err.message);
      socket.emit('pairError', err.message);
    }
  });

  userSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      socket.emit('qr', qr);
      console.log(`📱 QR generated for ${phone}`);
    }

    if (connection === 'open') {
      console.log(`✅ User connected: ${phone}`);

      // Emit to browser immediately
      socket.emit('sessionReady', userSessionId);
      console.log(`📡 sessionReady emitted: ${userSessionId}`);

      // Save creds
      await saveCreds();

      // Save to Supabase in background
      try {
        const zip = new AdmZip();
        zip.addLocalFolder(userSessionDir);
        const zipBuffer = zip.toBuffer();
        const base64 = zipBuffer.toString('base64');
        await supabase
          .from('bu_sessions')
          .upsert({ id: userSessionId, data: base64 });
        console.log(`💾 User session saved: ${userSessionId}`);
      } catch (err) {
        console.error('❌ Save error:', err.message);
      }

      // Send session ID to WhatsApp
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
        console.log(`✅ Session ID sent to ${phone}`);
      } catch (err) {
        console.error('❌ Could not send session ID:', err.message);
      }

      // Close pair session after 20 seconds
      setTimeout(async () => {
        try { userSock.end(); } catch {}
        try {
          fs.rmSync(userSessionDir, { recursive: true, force: true });
          console.log(`🗑️ Pair session cleaned: ${userSessionId}`);
        } catch {}
      }, 20000);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`🔴 User session closed: ${phone}, reason: ${reason}`);

      if (reason === 515) {
        console.log('⚠️ Stream error for user session - normal after pairing');
        return;
      }

      if (reason !== DisconnectReason.loggedOut && reason !== 408) {
        socket.emit('sessionError', 'Connection failed. Please try again.');
      }
    }
  });

  userSock.ev.on('creds.update', saveCreds);
}

// Deploy user bot
async function deployUserBot(socket, phone, sessionId) {
  try {
    console.log(`🚀 Deploying bot for ${phone}`);

    // Check if already running
    if (activeBots.has(sessionId)) {
      console.log(`✅ Bot already running for ${sessionId}`);
      socket.emit('botDeployed', { sessionId, phone });
      return;
    }

    const userSessionDir = join(__dirname, `running_bots/${sessionId}`);
    if (!fs.existsSync(userSessionDir)) {
      fs.mkdirSync(userSessionDir, { recursive: true });
    }

    // Load session
    const loaded = await loadFromSupabase(sessionId, userSessionDir);
    if (!loaded) {
      socket.emit('deployError', 'Session not found! Please get a new Session ID.');
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
      browser: ['SpeedyMD-Bot', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
    });

    activeBots.set(sessionId, userSock);

    userSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`✅ User bot live: ${phone}`);

        // Notify browser
        socket.emit('botDeployed', { sessionId, phone });

        // Send confirmation to WhatsApp
        try {
          const userJid = phone + '@s.whatsapp.net';
          await userSock.sendMessage(userJid, {
            text:
              `🎉 *Your SpeedyMD Bot is LIVE!*\n\n` +
              `✅ Bot is now running!\n\n` +
              `🤖 *Bot:* SpeedyMD\n` +
              `📱 *Number:* +${phone}\n` +
              `⚡ *Prefix:* ${PREFIX}\n\n` +
              `📋 *Try these commands:*\n` +
              `▸ ${PREFIX}menu\n` +
              `▸ ${PREFIX}ping\n` +
              `▸ ${PREFIX}alive\n` +
              `▸ ${PREFIX}play\n` +
              `▸ ${PREFIX}tt\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━\n` +
              `📢 *Follow our channel:*\n` +
              `${CHANNEL_LINK}\n\n` +
              `_Powered by SwiftBot Tec_ ⚡`
          });
        } catch (err) {
          console.error('❌ Deploy message error:', err.message);
        }

        // Save session every 5 minutes
        setInterval(async () => {
          await syncToSupabase(sessionId, userSessionDir);
        }, 5 * 60 * 1000);
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔴 User bot closed: ${phone}, reason: ${reason}`);
        activeBots.delete(sessionId);

        if (reason !== DisconnectReason.loggedOut) {
          console.log(`🔄 Reconnecting user bot: ${phone}`);
          setTimeout(() => {
            deployUserBot(socket, phone, sessionId);
          }, 5000);
        } else {
          console.log(`🚪 User bot logged out: ${phone}`);
          try {
            fs.rmSync(userSessionDir, { recursive: true, force: true });
          } catch {}
          await supabase
            .from('bu_sessions')
            .delete()
            .eq('id', sessionId);
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
    activeBots.delete(sessionId);
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
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  // Handle browser connections
  io.on('connection', (socket) => {
    console.log('🌐 Browser connected');

    socket.on('startSession', async (phone) => {
      try {
        console.log(`📱 startSession for: ${phone}`);
        await startUserSession(socket, phone);
      } catch (err) {
        console.error('❌ Session error:', err.message);
        socket.emit('sessionError', err.message);
      }
    });

    socket.on('deployBot', async ({ sessionId, phone }) => {
      try {
        console.log(`🚀 deployBot for: ${phone}`);
        await deployUserBot(socket, phone, sessionId);
      } catch (err) {
        console.error('❌ Deploy error:', err.message);
        socket.emit('deployError', err.message);
      }
    });

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
        console.log('⚠️ Stream conflict! Exiting...');
        process.exit(1);
      }

      if (reason === DisconnectReason.loggedOut) {
        console.log('🚪 Logged out. Clearing session...');
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        await supabase
          .from('bu_sessions')
          .delete()
          .eq('id', SESSION_ID);
        setTimeout(startBot, 3000);
      } else if (reason === DisconnectReason.restartRequired) {
        console.log('🔄 Restart required...');
        setTimeout(startBot, 3000);
      } else if (reason === DisconnectReason.timedOut) {
        console.log('⏱️ Timed out. Reconnecting...');
        setTimeout(startBot, 5000);
      } else {
        console.log('🔄 Reconnecting...');
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