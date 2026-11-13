---
name: conversations
description: Saving this agent's conversations to Oru, linking this machine so its hooks have their key (nothing to paste), checking whether saving is on, and pausing it. Use when Oru's setup checks conversations, or the user says "don't save this", "stop saving", "resume saving", or asks whether Oru keeps what they talk about here.
user-invocable: true
---

# Conversations in Oru

Oru's link lists nine tools: a tool named here that is not in your list runs through `run_oru_read` when it only reads and through `run_oru_write` when it changes something (its name and its arguments), and `find_oru_tool` says what it takes.

While the oru plugin has an access key, every Claude Code session is saved to the user's **private** chat for the folder's project in orubrand.com. Oru learns from it through the agent that uses it, never on a model of its own: when `what_oru_knows` (or the context Oru adds to a prompt) says conversations wait to be learned from, call `conversations_to_learn` through `run_oru_read`, keep what should last with `remember` (with the conversation's id), and mark each with `learned_from_conversation` through `run_oru_write`. When you are not sure something should last, ask the user first. What is saved: the user's messages and the agent's replies, with one line per action ("→ Edit app/Login.tsx", "→ Bash npm test"). Never tool output or file contents, and secrets are stripped on this machine before anything is sent (and again by Oru).

The command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/oru.mjs" <command>`. Every command prints JSON.

| Command | What it does |
|---|---|
| `status` | `keySet`, which Oru server, whether `savingConversations` is on, and `notReachingOru`: the sessions whose last send failed, and why |
| `link <code> --url <url>` | Trades the one-time code `link_this_machine` returned for the hooks' key, kept in `~/.oru/key` (readable only by the user) and never printed |
| `set-key` | Only for a key the user made themselves: reads it from stdin into `~/.oru/key` |
| `logout` | Forgets that key |
| `pause <sessionId>` | Stops saving one session, from now on |
| `resume <sessionId>` | Saves it again from the next reply |

## Connect (from setup)

1. Run `status`. Key set, saving on and `notReachingOru` empty: show "Claude Code conversations: saved to Oru". A session in `notReachingOru` did not reach Oru: say so with its why. When the why is that the folder is tied to no project, nothing is lost (it waits on this machine and is sent once the folder is tied): ask the person which project it is (`list_projects` through `run_oru_read`) and tie it with `link_this_machine` through `run_oru_write`.
2. No key: it is the same Oru account the agent already signed in with, so do it without asking. Call `link_this_machine` with this machine's name (and the folder and project, when you know them): it answers with `hooksKey`, a one-time code good for five minutes, and the `url` to trade it at. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/oru.mjs" link <code> --url <url>` right away, then `status` again. Never show or repeat the code to the user. The key it makes is listed in Oru under Connect your agent ("Oru plugin on <machine>"), where the user can revoke it.
3. If `hooksKey` is null, this agent connected with an access key: the hooks use that same key, from the plugin's **Oru access key** option or `ORUBRAND_TOKEN`. Say so; never ask for the key in the chat.
4. Saving off: it was turned off in the plugin's **Save conversations** option; say so and leave it.

## "Don't save this"

When the user asks not to save the conversation (or part of it): find this session's id (the `session_id` Claude Code reports, also the name of the current transcript file), run `pause <sessionId>`, and confirm in one line that nothing more from this session goes to Oru. What was already sent stays in their private chat, where they can delete it. `resume <sessionId>` turns it back on.

## Rules

- Never claim a conversation was saved if `status` says otherwise, or lists it in `notReachingOru`.
- The conversation lives in the user's private chat; teammates do not see it. Only the memories Oru learns follow the team's normal review.
