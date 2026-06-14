import { cacheMessage } from '../lib/msgcache.js';

export default async function cacheMessagesObserver(sock, msg, { from }) {
  try {
    if (from === 'status@broadcast') return;
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    cacheMessage(msg.key, msg);
  } catch (err) {
    console.error('❌ Cache observer error:', err.message);
  }
}