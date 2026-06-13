import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = new Map();
const observers = [];

async function loadCommands() {
  const commandsDir = join(__dirname, '../commands');
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
    return;
  }

  async function readDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await readDir(filePath);
      } else if (file.endsWith('.js')) {
        try {
          const mod = await import(pathToFileURL(filePath).href);
          if (!mod.name) {
            console.log(`⚠️ Skipping ${file} — no export const name`);
            continue;
          }

          // Support array of names or single name
          const names = Array.isArray(mod.name) ? mod.name : [mod.name];

          for (const cmdName of names) {
            if (commands.has(cmdName)) {
              console.log(`⚠️ Duplicate skipped: ${cmdName} in ${file}`);
              continue;
            }
            commands.set(cmdName, mod);
            console.log(`✅ Loaded: ${cmdName} [${mod.category || 'General'}]`);
          }
        } catch (err) {
          console.error(`❌ FAILED ${file}:`, err.stack);
        }
      }
    }
  }

  await readDir(commandsDir);
  console.log(`📦 Total commands loaded: ${commands.size}`);
}

async function loadObservers() {
  const observersDir = join(__dirname, '../observers');
  if (!fs.existsSync(observersDir)) {
    fs.mkdirSync(observersDir, { recursive: true });
    return;
  }

  const files = fs.readdirSync(observersDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      try {
        const filePath = join(observersDir, file);
        const mod = await import(pathToFileURL(filePath).href);
        if (mod.default) {
          observers.push(mod.default);
          console.log(`👁️ Observer loaded: ${file}`);
        }
      } catch (err) {
        console.error(`❌ FAILED observer ${file}:`, err.stack);
      }
    }
  }
}

function resolveJid(jid) {
  if (!jid) return null;
  if (jid.includes('@lid')) {
    return jid.replace('@lid', '@s.whatsapp.net');
  }
  return jid;
}

async function getAdminStatus(sock, jid, botJid) {
  try {
    const metadata = await sock.groupMetadata(jid);
    const participants = metadata.participants;
    const botId = botJid.split(':')[0] + '@s.whatsapp.net';
    const isBotAdmin = participants.find(p =>
      resolveJid(p.id) === botId
    )?.admin != null;
    return { groupMetadata: metadata, isBotAdmin };
  } catch {
    return { groupMetadata: null, isBotAdmin: false };
  }
}

export async function handleMessage(sock, m, PREFIX) {
  const msg = m.messages[0];
  if (!msg) return;

  const from = msg.key.remoteJid;
  const isGroup = from?.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
  const resolvedSender = resolveJid(sender);

  // Log message types
  if (msg.message) {
    const msgTypes = Object.keys(msg.message);
    console.log(`📨 Message from ${from}: ${msgTypes.join(', ')}`);
  }

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || '';

  // Handle status broadcasts
  if (from === 'status@broadcast') {
    for (const observer of observers) {
      try {
        await observer(sock, msg, { from, sender: resolvedSender, isGroup: false, body });
      } catch (err) {
        console.error('❌ Status observer error:', err.message);
      }
    }
    return;
  }

  // Skip own messages
  if (msg.key.fromMe) return;

  // Run observers
  for (const observer of observers) {
    try {
      await observer(sock, msg, { from, sender: resolvedSender, isGroup, body });
    } catch (err) {
      console.error('❌ Observer error:', err.message);
    }
  }

  if (!body.startsWith(PREFIX)) return;

  const args = body.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = commands.get(commandName);

  if (!command) {
    console.log(`❓ Unknown command: ${commandName}`);
    return;
  }

  let groupMetadata = null;
  let isBotAdmin = false;
  let isAdmin = false;

  if (isGroup) {
    const adminData = await getAdminStatus(sock, from, sock.user.id);
    groupMetadata = adminData.groupMetadata;
    isBotAdmin = adminData.isBotAdmin;
    const senderData = groupMetadata?.participants?.find(
      p => resolveJid(p.id) === resolvedSender
    );
    isAdmin = senderData?.admin != null;
  }

  try {
    await command.execute({
      sock,
      msg,
      from,
      sender: resolvedSender,
      args,
      isGroup,
      isAdmin,
      isBotAdmin,
      groupMetadata,
      PREFIX,
      getAllCommands,
      commandName,
    });
  } catch (err) {
    console.error(`❌ Command error [${commandName}]:`, err.stack);
    await sock.sendMessage(from, {
      text: `❌ Error running .${commandName}\n${err.message}`
    });
  }
}

export function getAllCommands() {
  return commands;
}

await loadCommands();
await loadObservers();