import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// Required environment variables
const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'OWNER_NUMBER',
];

// Required folders
const REQUIRED_FOLDERS = [
  'commands',
  'observers',
  'session',
  'public',
];

console.log('🚀 Starting SpeedyMD...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check environment variables
let missingEnv = false;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    missingEnv = true;
  } else {
    console.log(`✅ ${key} is set`);
  }
}

if (missingEnv) {
  console.error('\n❌ Please set all required environment variables on Render!');
  process.exit(1);
}

// Create missing folders
for (const folder of REQUIRED_FOLDERS) {
  const folderPath = join(root, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Created folder: ${folder}/`);
  } else {
    console.log(`✅ Folder exists: ${folder}/`);
  }
}

// Test Supabase connection
try {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  const { error } = await supabase
    .from('bu_sessions')
    .select('id')
    .limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }
  console.log('✅ Supabase connected successfully');
} catch (err) {
  console.error('❌ Supabase error:', err.message);
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ ${process.env.BOT_NAME || 'SpeedyMD'} is ready to start!`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
