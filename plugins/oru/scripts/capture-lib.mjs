// Pure helpers for saving coding-agent conversations to Oru: turning a Claude
// Code transcript (JSONL) into the user's and the agent's messages, with one
// line per action and no tool output, and stripping secrets before anything
// leaves the machine. No network (capture-lib.test.mjs).

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(sk|pk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  /\boru-link-[A-Za-z0-9_-]{20,}/g,
  /\borb_[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi;
const URL_PASSWORD = /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@/]+@/gi;
const SECRET_ASSIGNMENT =
  /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*)\s*([=:])\s*("[^"\n]*"|'[^'\n]*'|[^\s"']+)/gi;

export function redactSecrets(text) {
  let out = String(text)
    .replace(SECRET_ASSIGNMENT, (_m, name, sep) => `${name}${sep}[redacted]`)
    .replace(BEARER, 'Bearer [redacted]')
    .replace(URL_PASSWORD, (_m, prefix) => `${prefix}:[redacted]@`);
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '[redacted]');
  return out;
}

// Harness wrappers that are not something the person typed.
function cleanUserText(text) {
  return String(text)
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>/g, '[pasted content]')
    .trim();
}

const isHarnessText = (text) => /^<(local-command|bash-stdout|bash-stderr|user-prompt-submit-hook)/.test(text);

// A slash command the person typed is something they asked for: keep it as
// "/name args" instead of the harness markup around it.
function slashCommand(text) {
  if (!/^<command-(name|message)>/.test(text)) return null;
  const name =
    text.match(/<command-name>\/?([^<]+)<\/command-name>/)?.[1] ??
    text.match(/<command-message>([^<]+)<\/command-message>/)?.[1];
  if (!name) return null;
  const args = text.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1]?.trim();
  return `/${name.trim()}${args ? ` ${args}` : ''}`;
}

const TOOL_TARGET_KEYS = [
  'file_path',
  'path',
  'notebook_path',
  'url',
  'pattern',
  'query',
  'description',
  'command',
  'skill',
  'prompt',
];

/** One short line for an action the agent took, never its output. */
export function actionLine(block) {
  const name = String(block?.name ?? 'tool').replace(
    /^mcp__([^_]+(?:_[^_]+)*)__/,
    (_m, server) => `${server.replace(/^claude_ai_/, '')}: `,
  );
  const input = block?.input && typeof block.input === 'object' ? block.input : {};
  const key = TOOL_TARGET_KEYS.find((k) => typeof input[k] === 'string' && input[k].trim());
  const target = key ? redactSecrets(input[key].split('\n')[0]).slice(0, 120) : '';
  return `→ ${name}${target ? ` ${target}` : ''}`;
}

// THE VAULT STAYS ON THE MAC (ADR 0160): a reply that asked the person's vault
// is saved as one line, never its words or its actions, the same line Oru's
// own chat keeps. The agent still holds what the Mac said for the rest of the
// conversation, so every later reply is saved as a line too; the person's own
// messages are saved as before. What the Mac said lives on the Mac.
const VAULT_TOOL = /(?:^|__)(?:ask_vault|search_vault|vault_person)$/;
export const VAULT_REPLY_SAVED = 'I answered this from your vault, on your Mac. Oru keeps no copy of that answer.';
export const AFTER_VAULT_SAVED = 'Oru keeps no copy of this reply: your vault was read earlier in this conversation.';

/** Whether an agent's entry, a subagent's included, asked the person's vault. */
const asksVault = (entry) =>
  entry?.type === 'assistant' &&
  Array.isArray(entry.message?.content) &&
  entry.message.content.some((block) => block?.type === 'tool_use' && VAULT_TOOL.test(String(block.name ?? '')));

/**
 * The conversation in transcript lines, oldest first: one user turn per
 * prompt, and one agent turn per reply (its text plus a line per action).
 * Subagent (sidechain), meta, compact-summary, thinking and tool-result
 * entries are left out. `vaultRead` says the vault was read in lines saved
 * before these; the answer says whether it has been by their end.
 */
export function transcriptTurns(lines, { vaultRead = false } = {}) {
  const turns = [];
  let reply = null;
  let read = vaultRead;
  const flush = () => {
    if (reply?.vault) {
      turns.push({ id: reply.id, role: 'assistant', text: VAULT_REPLY_SAVED, at: reply.at });
      read = true;
    } else if (reply && (reply.texts.length || reply.actions.length)) {
      const text = [...reply.texts, ...(reply.actions.length ? [reply.actions.join('\n')] : [])].join('\n\n').trim();
      if (text) {
        turns.push({
          id: reply.id,
          role: 'assistant',
          text: read ? AFTER_VAULT_SAVED : redactSecrets(text),
          at: reply.at,
        });
      }
    }
    reply = null;
  };

  for (const line of lines) {
    let entry;
    try {
      entry = typeof line === 'string' ? JSON.parse(line) : line;
    } catch {
      continue;
    }
    // A subagent that asked the vault hands what the Mac said to the reply it works for, and that reply to the rest.
    if (entry?.isSidechain && asksVault(entry)) {
      if (reply) reply.vault = true;
      else read = true;
    }
    // A compact summary is the harness retelling the conversation, vault answers included, never the person.
    if (!entry || entry.isSidechain || entry.isMeta || entry.isCompactSummary || !entry.message) continue;
    const content = entry.message.content;

    if (entry.type === 'user') {
      // Tool results arrive as user entries; they are output, not the person.
      if (Array.isArray(content) && content.some((b) => b?.type === 'tool_result')) continue;
      const raw =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((b) => b?.type === 'text')
                .map((b) => b.text)
                .join('\n')
            : '';
      const cleaned = cleanUserText(raw);
      const text = slashCommand(cleaned) ?? cleaned;
      if (!text || isHarnessText(text) || text.startsWith('<command-')) continue;
      flush();
      turns.push({ id: entry.uuid, role: 'user', text: redactSecrets(text), at: entry.timestamp ?? null });
    } else if (entry.type === 'assistant' && Array.isArray(content)) {
      if (!reply) reply = { id: entry.uuid, at: entry.timestamp ?? null, texts: [], actions: [], vault: false };
      for (const block of content) {
        if (block?.type === 'text' && block.text?.trim()) reply.texts.push(block.text.trim());
        else if (block?.type === 'tool_use') {
          reply.actions.push(actionLine(block));
          if (VAULT_TOOL.test(String(block.name ?? ''))) reply.vault = true;
        }
      }
    }
  }
  flush();
  return { turns, vaultRead: read };
}
