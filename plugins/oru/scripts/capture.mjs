#!/usr/bin/env node
// Stop / SessionEnd hook: saves this session's new messages to Orubrand. The hook itself only hands the work
// to a detached process and exits, so the session never waits. That process reads the transcript from where
// the last send stopped, keeps the person's and the agent's messages (one line per action, no tool output,
// secrets stripped) and posts them to <orubrand>/agent-sessions. It fails silently: Orubrand being down never
// breaks a session, and an unsent part is retried on the next reply.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcriptTurns } from './capture-lib.mjs';
import { oruKey, oruUrl, readJson, SESSIONS_DIR, savingConversations, writePrivateJson } from './oru-auth.mjs';
import { readHookInput, workspaceFor } from './workspace.mjs';

// The engine takes at most 50 turns in one post.
const BATCH = 50;
const SESSION_ID = /^[A-Za-z0-9._:-]{1,120}$/;

async function flush(sessionId, transcriptPath, cwd, event) {
  const lock = join(SESSIONS_DIR, `${sessionId}.lock`);
  if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < 60_000) return;
  writePrivateJson(lock, { at: Date.now() });
  const stateFile = join(SESSIONS_DIR, `${sessionId}.json`);
  const state = readJson(stateFile) ?? { sent: 0 };
  try {
    const key = oruKey();
    if (!key) return;
    const lines = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
    // Once the vault was read in this conversation, every later reply is saved as a line (capture-lib.mjs, ADR 0160).
    const { turns, vaultRead } = transcriptTurns(lines.slice(state.sent), { vaultRead: state.vaultRead === true });
    const ended = event === 'SessionEnd';
    if (!turns.length && !ended) {
      writePrivateJson(stateFile, { ...state, sent: lines.length, vaultRead });
      return;
    }
    const workspace = workspaceFor(cwd);
    const chunks = turns.length
      ? Array.from({ length: Math.ceil(turns.length / BATCH) }, (_, i) => turns.slice(i * BATCH, (i + 1) * BATCH))
      : [[]];
    for (const [i, chunk] of chunks.entries()) {
      const res = await fetch(`${oruUrl()}/agent-sessions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          client: 'Claude Code',
          machine: hostname().slice(0, 80),
          workspace,
          turns: chunk,
          ended: ended && i === chunks.length - 1,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const why = body?.error?.message ?? body?.error ?? res.statusText;
        writePrivateJson(stateFile, {
          ...state,
          lastError: `${res.status}: ${why}`,
          lastErrorAt: new Date().toISOString(),
        });
        return;
      }
    }
    writePrivateJson(stateFile, { sent: lines.length, lastSentAt: new Date().toISOString(), vaultRead });
  } catch (error) {
    writePrivateJson(stateFile, {
      ...state,
      lastError: String(error?.message ?? error),
      lastErrorAt: new Date().toISOString(),
    });
  } finally {
    rmSync(lock, { force: true });
  }
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'flush') {
  await flush(...args).catch(() => {});
} else {
  // Hook entry point: decide quickly, hand off, exit 0 whatever happens.
  try {
    const input = readHookInput();
    const sessionId = String(input.session_id ?? '');
    const transcript = String(input.transcript_path ?? '');
    const paused = existsSync(join(SESSIONS_DIR, `${sessionId}.paused`));
    if (savingConversations() && !paused && SESSION_ID.test(sessionId) && transcript && existsSync(transcript)) {
      spawn(
        process.execPath,
        [
          fileURLToPath(import.meta.url),
          'flush',
          sessionId,
          transcript,
          String(input.cwd ?? process.cwd()),
          String(input.hook_event_name ?? ''),
        ],
        { detached: true, stdio: 'ignore', env: process.env },
      ).unref();
    }
  } catch {
    // Saving a conversation must never break the session.
  }
}
