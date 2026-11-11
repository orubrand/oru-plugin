---
name: conversations
description: Saving this agent's conversations to Oru, linking this machine so its hooks have their key (nothing to paste), checking whether saving is on, and pausing it. Use when Oru's setup checks conversations, or the user says "don't save this", "stop saving", "resume saving", or asks whether Oru keeps what they talk about here.
user-invocable: true
---

# Conversations in Oru

Oru's link lists a short set of tools first: a tool named here that is not in your list runs through `use_tool` (its name and its arguments), and `more_tools` says what it takes.

While the oru plugin has an access key, every Claude Code session is saved to the user's **private** chat for the folder's project in orubrand.com. Oru learns from what the user says there, the same way it learns from its own chat. What is saved: the user's messages and the agent's replies, with one line per action ("→ Edit app/Login.tsx", "→ Bash npm test"). Never tool output or file contents, and secrets are stripped on this machine before anything is sent (and again by Orubrand).

The command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/oru.mjs" <command>`. Every command prints JSON.

| Command | What it does |
|---|---|
| `status` | `keySet`, which Orubrand, and whether `savingConversations` is on |
| `link <code> --url <url>` | Trades the one-time code `link_this_machine` returned for the hooks' key, kept in `~/.oru/key` (readable only by the user) and never printed |
| `set-key` | Only for a key the user made themselves: reads it from stdin into `~/.oru/key` |
| `logout` | Forgets that key |
| `pause <sessionId>` | Stops saving one session, from now on |
| `resume <sessionId>` | Saves it again from the next reply |

## Connect (from setup)

1. Run `status`. Key set and saving on: show "Claude Code conversations: saved to Oru".
2. No key: it is the same Orubrand account the agent already signed in with, so do it without asking. Call `link_this_machine` with this machine's name (and the folder and project, when you know them): it answers with `hooksKey`, a one-time code good for five minutes, and the `url` to trade it at. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/oru.mjs" link <code> --url <url>` right away, then `status` again. Never show or repeat the code to the user. The key it makes is listed in Orubrand under Connect your agent ("Oru plugin on <machine>"), where the user can revoke it.
3. If `hooksKey` is null, this agent connected with an access key: the hooks use that same key, from the plugin's **Orubrand access key** option or `ORUBRAND_TOKEN`. Say so; never ask for the key in the chat.
4. Saving off: it was turned off in the plugin's **Save conversations** option; say so and leave it.

## "Don't save this"

When the user asks not to save the conversation (or part of it): find this session's id (the `session_id` Claude Code reports, also the name of the current transcript file), run `pause <sessionId>`, and confirm in one line that nothing more from this session goes to Oru. What was already sent stays in their private chat, where they can delete it. `resume <sessionId>` turns it back on.

## Rules

- Never claim a conversation was saved if `status` says otherwise.
- The conversation lives in the user's private chat; teammates do not see it. Only the memories Oru learns follow the team's normal review.
