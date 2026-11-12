---
name: sync
description: Sync a connector into Oru. Figma is read on this machine and pushed as frames (only the changed ones); Google Drive, Microsoft 365 and Slack are read by Oru itself. Use after /oru:setup, or any time to refresh incrementally.
arguments: [connector]
user-invocable: true
---

Sync `$connector` into Oru: `figma`, `google_drive` (or `drive`), `microsoft`, `slack`, or `all` for every connected one (the default). The company file server has its own skill (`connect`).

Oru's link lists nine tools: a tool named here that is not in your list runs through `run_oru_read` when it only reads and through `run_oru_write` when it changes something (its name and its arguments), and `find_oru_tool` says what it takes.

1. Call `get_setup_status` and the provider's status tool (`drive_status`, `microsoft_status`, `slack_status`). If the requested connector is not connected, stop and tell the user to run `/oru:setup` first.
2. Call `get_sync_state` for the connector (with the project for Figma) to see what Oru already has: sources, totals, failed, last run.
3. **Drive, Microsoft 365, Slack**: Oru reads them itself. For each saved source, call `sync_drive_source`, `sync_microsoft_source` or `sync_slack_channel` again; it skips what did not change. New links the user gives you go through `add_sources`.
4. **Figma**: launch the `oru-indexer` subagent for the project, passing it the sync-state snapshot (the files Oru keeps for the project and the frames it has) and any new Figma file links the user gave you, which it keeps with `add_sources`, so it skips frames that are already up to date.
5. When it finishes, call `get_sync_state` again and report a summary: sources, indexed, failed, and what could not be read. Running this twice in a row with nothing changed indexes nothing new.

Never call `ingest_batch` or `ingest_asset` from this skill; that is the subagent's job, so a large Figma sync runs in its own context instead of flooding this conversation.
