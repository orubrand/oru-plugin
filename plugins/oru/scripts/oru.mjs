#!/usr/bin/env node
// The plugin's small command, for the conversations skill. Every command prints JSON.
//
//   oru.mjs status                    key set? saving conversations on? which Orubrand?
//   oru.mjs link <code> [--url <url>]  trades the one-time code link_this_machine gave the agent for the hooks' key
//   oru.mjs set-key                   reads an Orubrand access key from stdin into ~/.oru/key (0600)
//   oru.mjs logout                    forgets that key
//   oru.mjs pause <sessionId>         stops saving one session, from now on
//   oru.mjs resume <sessionId>        saves it again from the next reply
//
// The agent signs in to Orubrand (OAuth) for the MCP connection; its hooks get their own key from that sign-in
// with `link` (ADR 0134), so the person pastes nothing. The key is written to ~/.oru/key and never printed.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { KEY_FILE, oruKey, oruUrl, SESSIONS_DIR, savingConversations, URL_FILE, writePrivate } from './oru-auth.mjs';

const print = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function setPaused(sessionId, paused) {
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(String(sessionId ?? '')))
    fail('Pass the session id (the session_id Claude Code reports).');
  const marker = join(SESSIONS_DIR, `${sessionId}.paused`);
  if (paused) writePrivate(marker, new Date().toISOString());
  else if (existsSync(marker)) rmSync(marker);
  print({ sessionId, saving: !paused });
}

/** Trades a one-time code for the hooks' key, at the Orubrand that gave it (`--url`, from link_this_machine). */
async function link(code, url) {
  if (!/^oru-link-[A-Za-z0-9_-]{32}$/.test(String(code ?? '')))
    fail('Pass the code link_this_machine returned (oru-link-…).');
  const base = (url || oruUrl()).replace(/\/+$/, '');
  const response = await fetch(`${base}/agent-link/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(15_000),
  }).catch((error) => fail(`Oru could not be reached at ${base}: ${error.message}`));
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.token !== 'string')
    fail(body?.error?.message ?? `Oru refused the code (${response.status}).`);
  writePrivate(KEY_FILE, `${body.token}\n`);
  if (url) writePrivate(URL_FILE, `${base}\n`);
  // The key is never printed: it stays in ~/.oru/key, readable only by its owner.
  print({ keySet: true, oru: base, label: body.label ?? null, expiresAt: body.expiresAt ?? null });
}

const [command, arg, ...rest] = process.argv.slice(2);
if (command === 'status') {
  print({ keySet: Boolean(oruKey()), oru: oruUrl(), savingConversations: savingConversations() });
} else if (command === 'set-key') {
  const key = readFileSync(0, 'utf8').trim();
  if (!/^orb_[A-Za-z0-9_-]{10,}$/.test(key))
    fail('Pipe in an Oru access key (it starts with orb_): printf %s "$KEY" | node oru.mjs set-key');
  writePrivate(KEY_FILE, `${key}\n`);
  print({ keySet: true });
} else if (command === 'link') {
  const at = rest.indexOf('--url');
  await link(arg, at === -1 ? '' : (rest[at + 1] ?? ''));
} else if (command === 'logout') {
  rmSync(KEY_FILE, { force: true });
  rmSync(URL_FILE, { force: true });
  print({ keySet: Boolean(oruKey()) });
} else if (command === 'pause') {
  setPaused(arg, true);
} else if (command === 'resume') {
  setPaused(arg, false);
} else {
  fail('Usage: oru.mjs status | link <code> [--url <url>] | set-key | logout | pause <sessionId> | resume <sessionId>');
}
