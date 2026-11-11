# Oru for Orubrand

Oru is your team's shared brain for business, brand and design. This plugin connects Claude Code to Orubrand:
its MCP server, hooks that give Oru's context on every prompt and save your conversations (you can turn that
off), skills, and Oru Connect for your company's file server.

## Install in Claude Code

```bash
claude plugin marketplace add orubrand/oru-plugin && claude plugin install oru@orubrand
```

Then sign in to Orubrand, once:

```bash
claude mcp login plugin:oru:orubrand
```

Your browser opens Orubrand: sign in and allow it. In Claude Code you can do the same from `/mcp`: pick
`plugin:oru:orubrand` and choose Authenticate. Oru then links this machine, so the hooks need no key.

## Only the MCP server

Without the plugin, for any agent: add `https://orubrand-engine-256639630693.us-west1.run.app/mcp` as an HTTP MCP server and sign in.

- Claude Code: `claude mcp add --transport http --scope user orubrand https://orubrand-engine-256639630693.us-west1.run.app/mcp && claude mcp login orubrand`
- Codex: `codex mcp add orubrand --url https://orubrand-engine-256639630693.us-west1.run.app/mcp && codex mcp login orubrand`
- Claude Desktop, Claude.ai and ChatGPT: add `https://orubrand-engine-256639630693.us-west1.run.app/mcp` as a custom connector.

## Which Orubrand

This build talks to `https://orubrand-engine-256639630693.us-west1.run.app`. To use another one, change the plugin's `oru_url` option:
`claude plugin configure oru@orubrand`.

## Where it comes from

Version `0.1.4-qa.202611110221`, built from `orubrand/orubrand@2784c43bced2` (`plugins/oru`).
This repository is published automatically: changes made here are overwritten.
