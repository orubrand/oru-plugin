# Oru for Orubrand

Oru is your team's shared brain for business, brand and design. This plugin connects Claude Code to Orubrand:
its MCP server, hooks that give Oru's context on every prompt and save your conversations (you can turn that
off), skills, and Oru Connect for your company's file server.

## Install in Claude Code

One line installs the plugin and signs you in to Orubrand:

```bash
claude plugin marketplace add orubrand/oru-plugin && claude plugin install oru@orubrand && claude mcp login plugin:oru:orubrand
```

Your browser opens Orubrand: sign in and allow it. In Claude Code you can sign in from `/mcp` instead: pick
`plugin:oru:orubrand` and choose Authenticate. Oru then links this machine, so the hooks need no key. Claude Code
may say that the plugin's options are not set yet: their defaults are used, and you change them only to point at
another Orubrand or to stop saving conversations. Running the line again changes nothing.

## Only the MCP server

Without the plugin, for any agent: add `https://orubrand-engine-256639630693.us-west1.run.app/mcp` as an HTTP MCP server and sign in.

- Claude Code: `claude mcp add --transport http --scope user orubrand https://orubrand-engine-256639630693.us-west1.run.app/mcp && claude mcp login orubrand`
- Codex: `codex mcp add orubrand --url https://orubrand-engine-256639630693.us-west1.run.app/mcp && codex mcp login orubrand`
- Claude Desktop, Claude.ai and ChatGPT: add `https://orubrand-engine-256639630693.us-west1.run.app/mcp` as a custom connector.

## Which Orubrand

This build talks to `https://orubrand-engine-256639630693.us-west1.run.app`. To use another one, change the plugin's `oru_url` option:
`claude plugin configure oru@orubrand`.

## Where it comes from

Version `0.1.4-qa.202611120456`, built from `orubrand/orubrand@42c2227b3fa2` (`plugins/oru`).
This repository is published automatically: changes made here are overwritten.
