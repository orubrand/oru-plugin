// Shared by the plugin's hooks and its small command: where Orubrand is, the access key the hooks use, and
// whether saving conversations is on. Hooks receive the plugin's options as CLAUDE_PLUGIN_OPTION_<KEY>;
// a script the agent runs does not, so the same names can also come from the environment or a file.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Orubrand's address when nothing says otherwise. The owner can change it here, in one place. */
export const DEFAULT_ORU_URL = 'https://orubrand-engine-256639630693.us-west1.run.app';

export const ORU_DIR = process.env.ORU_HOME || join(homedir(), '.oru');
export const SESSIONS_DIR = join(ORU_DIR, 'sessions');
export const KEY_FILE = join(ORU_DIR, 'key');
/** The Orubrand `oru link` traded its code with, so the hooks talk to the same one. */
export const URL_FILE = join(ORU_DIR, 'url');

export const readJson = (path) => {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
  } catch {
    return null;
  }
};

/** A file only its owner can read, in a folder only its owner can open. */
export function writePrivate(path, text) {
  mkdirSync(join(path, '..'), { recursive: true, mode: 0o700 });
  writeFileSync(path, text, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export const writePrivateJson = (path, value) => writePrivate(path, JSON.stringify(value, null, 2));

export function oruUrl() {
  const linked = existsSync(URL_FILE) ? readFileSync(URL_FILE, 'utf8').trim() : '';
  return (process.env.CLAUDE_PLUGIN_OPTION_ORU_URL || process.env.ORUBRAND_URL || linked || DEFAULT_ORU_URL).replace(
    /\/+$/,
    '',
  );
}

/**
 * The access key the hooks send: the plugin's "Orubrand access key" option (Claude Code keeps it in secure
 * storage and exports it as CLAUDE_PLUGIN_OPTION_API_TOKEN), else ORUBRAND_TOKEN (the name Orubrand's setup
 * tells Codex users to export), else the file `oru link` (or `oru set-key`) writes. Empty when there is none.
 */
export function oruKey() {
  const fromFile = existsSync(KEY_FILE) ? readFileSync(KEY_FILE, 'utf8').trim() : '';
  return process.env.CLAUDE_PLUGIN_OPTION_API_TOKEN || process.env.ORUBRAND_TOKEN || fromFile;
}

/** On unless the plugin's "Save conversations" option is turned off. */
export function savingConversations() {
  return String(process.env.CLAUDE_PLUGIN_OPTION_SAVE_CONVERSATIONS ?? 'true').toLowerCase() !== 'false';
}
