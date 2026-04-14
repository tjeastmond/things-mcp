# Things MCP

Local [Model Context Protocol](https://modelcontextprotocol.io/) server for **Things 3** on macOS. Exposes read/write tools over **stdio** so clients like Cursor or Codex can work with your inbox and tasks.

## Requirements

- macOS with **Things 3** installed
- **Node.js 22+**
- **pnpm**
- Automation permission for the process that launches the server (Terminal, Cursor, Codex, etc.) to control Things (System Settings → Privacy & Security → **Automation**)

## Install

```bash
pnpm install
pnpm run build
```

## Run

```bash
pnpm start
```

Or during development:

```bash
pnpm dev
```

## Cursor MCP configuration

Add a server entry that runs this project’s compiled entrypoint, for example:

```json
{
  "mcpServers": {
    "things": {
      "command": "node",
      "args": ["/absolute/path/to/things.mcp/dist/index.js"]
    }
  }
}
```

Use the real path to your clone. Ensure `pnpm run build` has been run so `dist/` exists.

## Tools

| Tool | Purpose |
|------|---------|
| `things_ping` | Connection check; returns server version (does not use Things) |
| `things_list_inbox` | List inbox tasks (limit 1–100, default 25) |
| `things_list_today` | List Today tasks |
| `things_search` | Substring search on title and notes |
| `things_add_todo` | Create a task (inbox by default; optional project/area, `when`, ISO `deadline`, `tags`) |
| `things_complete_todo` | Complete a task by **id** |

## Logging

Set `THINGS_MCP_LOG` to `error` (default), `info`, or `debug`. Logs go to stderr only.

## Smoke test (optional)

With Things installed and automation allowed:

```bash
THINGS_MCP_SMOKE=1 pnpm exec tsx test/smoke-test.ts
```

Creates a short-lived task, searches for it, then **deletes** it (Things moves it to Trash). Exits non-zero if cleanup deletion fails.

## Development

```bash
pnpm run typecheck
pnpm test
```
