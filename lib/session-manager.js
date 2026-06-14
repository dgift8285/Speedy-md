import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function syncToSupabase(sessionId, sessionDir) {
  try {
    if (!fs.existsSync(sessionDir)) return;
    const zip = new AdmZip();
    zip.addLocalFolder(sessionDir);
    const base64 = zip.toBuffer().toString('base64');
    await supabase.from('bu_sessions').upsert({ id: sessionId, data: base64 });
    console.log(`💾 Session synced: ${sessionId}`);
  } catch (err) {
    console.error('❌ Supabase sync error:', err.message);
  }
}

export async function loadFromSupabase(sessionId, sessionDir) {
  try {
    const { data, error } = await supabase
      .from('bu_sessions')
      .select('data')
      .eq('id', sessionId)
      .single();

    if (error || !data?.data) return false;

    const zip = new AdmZip(Buffer.from(data.data, 'base64'));
    zip.extractAllTo(sessionDir, true);
    console.log(`📦 Session loaded: ${sessionId}`);
    return true;
  } catch (err) {
    console.error('❌ Load error:', err.message);
    return false;
  }
}