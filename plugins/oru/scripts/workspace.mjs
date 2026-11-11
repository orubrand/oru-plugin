// Shared by the plugin's hooks: which folder the agent is working in, and the hook's input and output. The
// folder is sent as its git remote URL (every teammate's clone matches) or, with no remote, its folder name;
// Orubrand's link_this_machine ties that same text to a project.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export function workspaceFor(cwd) {
  const dir = cwd || process.cwd();
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 500,
    }).trim();
    if (remote) return remote;
  } catch {
    // Not a git repo, or no origin: fall back to the folder name.
  }
  return basename(dir);
}

/** The JSON the client pipes into a hook, or {} when there is none. */
export function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

/** Hand extra context to the model: the JSON shape both Claude Code and Codex accept. */
export function emitContext(hookEventName, additionalContext) {
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } })}\n`);
}
