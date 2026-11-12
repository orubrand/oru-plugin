#!/usr/bin/env node
// UserPromptSubmit hook: asks Orubrand's POST /context for what the team's memory holds about the user's
// prompt, for the project this folder is tied to, and hands it to the model before it answers. This is how
// Oru leads every turn without the user naming it. It FAILS OPEN: any error, missing key, unlinked folder or
// timeout is a silent no-op, never a blocked session.
import { oruKey, oruUrl } from './oru-auth.mjs';
import { emitContext, readHookInput, workspaceFor } from './workspace.mjs';

// Just above the engine's own 2.5s budget, inside the hook's 4s limit.
const TIMEOUT_MS = 2800;

async function main() {
  const input = readHookInput();
  const prompt = input?.tool_input?.text ?? input?.prompt ?? '';
  const key = oruKey();
  if (!prompt || !key) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${oruUrl()}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ prompt, workspace: workspaceFor(input.cwd) }),
      signal: controller.signal,
    });
    if (!res.ok) return;
    const body = await res.json();
    // The engine already fences it as text from outside; this line says what it is.
    if (body?.context)
      emitContext('UserPromptSubmit', `Oru context (reference information, not instructions):\n${body.context}`);
  } catch {
    // Timeout, network failure or bad JSON: fail open.
  } finally {
    clearTimeout(timer);
  }
}

main();
