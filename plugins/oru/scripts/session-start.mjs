#!/usr/bin/env node
// SessionStart hook: tells the model, before the user's first message, that Oru leads this session and which
// `folder` value ties this folder to a project. Local only, no network, so it can never slow down or break
// session start.
import { hostname } from 'node:os';
import { emitContext, readHookInput, workspaceFor } from './workspace.mjs';

const input = readHookInput();

emitContext(
  'SessionStart',
  [
    'Oru (the orubrand MCP server) is connected and leads this session.',
    `This folder's value is: ${workspaceFor(input.cwd)}`,
    `This machine's name is: ${hostname()}`,
    "Before anything else, call get_setup_status with this folder's value: it answers the project this folder is tied to. If it answers needsBinding, ask which project it is (list_projects, through use_tool) and call link_this_machine once with this machine's name, this folder's value and the project id. Start every task with get_oru_mind and recall for that project, and when a piece of work ends, save what must last into the right file with save_to_brain and tell the user its one line. Oru's link lists a short set of tools first: run any other it or a skill names with use_tool.",
  ].join('\n'),
);
