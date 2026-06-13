import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATE_FILE = join(__dirname, '../bot_state.json');

// Load state from file
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch {}
  return {};
}

// Save state to file
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ State save error:', err.message);
  }
}

// Get a set from state
export function getSet(key) {
  const state = loadState();
  return new Set(state[key] || []);
}

// Save a set to state
export function saveSet(key, set) {
  const state = loadState();
  state[key] = [...set];
  saveState(state);
}

// Get a value from state
export function getValue(key, defaultValue = null) {
  const state = loadState();
  return state[key] ?? defaultValue;
}

// Save a value to state
export function setValue(key, value) {
  const state = loadState();
  state[key] = value;
  saveState(state);
}

// Delete a key from state
export function deleteKey(key) {
  const state = loadState();
  delete state[key];
  saveState(state);
}